import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { createPortal } from 'react-dom'

import { useQuery, useQueryClient } from '@tanstack/react-query'

import { motion } from 'framer-motion'
import { toast } from 'react-hot-toast'
import {
  FiAward,
  FiBriefcase,
  FiGrid,
  FiInfo,
  FiPlus,
  FiSearch,
  FiX,
} from 'react-icons/fi'
import styled from 'styled-components'

import type {
  AdministrationDepartment,
  AdministrationDepartmentCategory,
  AdministrationDepartmentEventType,
} from '@/shared/api/administration-department'
import { administrationDepartmentApi } from '@/shared/api/administration-department'
import { apiConnection } from '@/shared/api/client'
import { getAllCountries } from '@/shared/api/countries'
import { getAllHistoricalCountries } from '@/shared/api/historical-countries'
import {
  createOrganization,
  getOrganizations,
  updateOrganization,
} from '@/shared/api/organizations'
import type {
  OrganizationResponseDto,
  OrganizationType,
} from '@/shared/api/organizations'
import {
  getUploadImageUrl,
  uploadImage,
  validateImageFile,
} from '@/shared/api/upload'
import { glassCardMixin } from '@/shared/styles/mixins'
import { useThemeStore } from '@/shared/styles/theme.store'
import { Z_INDEX } from '@/shared/styles/z-index'
import { DatePickerModal } from '@/shared/ui/date-picker/date-picker-modal'
import {
  ModalBody,
  ModalBox,
  ModalCloseButton,
  ModalHeader,
  ModalOverlay,
  ModalSubtitle,
  ModalTitle,
} from '@/shared/ui/modal/modal.styles'
import {
  FieldControl,
  FieldLabel,
  FieldRow,
  FormRows,
  FormSectionInner,
  TabButton,
  TabNavigation,
} from '@/shared/ui/register-form-layout'
import { AddButton, SectionTabHeader } from '@/shared/ui/section-page-layout'
import {
  SelectModal,
  type SelectOption,
} from '@/shared/ui/select-modal/select-modal'

import { mockGovernmentData } from '../mock'
import type { HistoricalEvent } from '../mock/types'
import { CabinetsSection } from './cabinets-section.widget'
import { HeadsOfStateSection } from './heads-of-state-section.widget'
import { MilitaryUnitFormModal } from './military-unit-form.modal'
import { MinistryCategoryTabBar } from './ministry-category-tab-bar'
import { MinistryDepartmentDetailView } from './ministry-department-detail.view'
import { MinistryDepartmentTree } from './ministry-department-tree'
import {
  buildDepartmentDescription,
  countDepartmentsByCategoryId,
  countDescendantsInDepartmentTree,
  emptyMinistryFormFields,
  filterDepartmentsBySearchQuery,
  isDefenseRelatedCategory,
  ministryFormFieldsFromDepartment,
} from './ministry-department-utils'
import { MinistryDeptSearchEmpty } from './ministry-dept-search-empty'
import { PositionDefinitionsSection } from './position-definitions-section.widget'

export type GovernmentContentTab =
  | 'heads'
  | 'statistics'
  | 'ministries'
  | 'cabinets'
  | 'organizations'
  | 'positions'

export interface GovernmentInfoSectionProps {
  /** 국가(현대/역사) — 행정부 탭에서 사용 */
  country?: import('@/entities/country/model/unified-types').UnifiedCountry
  /** 국가 ID (있으면 중앙부처 탭에서 API 연동 CRUD) */
  countryId?: string
  /** 카테고리 모달 열림 (헤더 버튼에서 제어 시 부모에서 전달) */
  categoryModalOpen?: boolean
  /** 카테고리 모달 닫기 콜백 */
  onCloseCategoryModal?: () => void
  /** 카테고리 모달 열기 콜백 (헤더 우측 버튼용, 부모에서 state 제어 시 전달) */
  onOpenCategoryModal?: () => void
  /** URL 등으로 역대 수반 탭 진입 시 첫 서브탭을 역대 수반으로 */
  initialContentTab?: GovernmentContentTab
}

// 메인·액센트 컬러 (트렌디한 다색 팔레트)
const MAIN = '#6366f1'
const BORDER_COLOR = '#e5e7eb'
const ACCENT = {
  teal: '#0d9488',
  amber: '#f59e0b',
  emerald: '#10b981',
  sky: '#0ea5e9',
} as const

/* 행정기구 리스트·모달 (인물 리스트/인물 등록 모달 참조) */
const OrgListHeader = styled.header`
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 20px 0 20px;
  margin-bottom: 24px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.default};
`
const OrgListHeaderRow = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
`
const OrgListHeaderTitleBlock = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`
const OrgListHeaderTitle = styled.h2`
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
  letter-spacing: -0.03em;
  display: flex;
  align-items: baseline;
  gap: 8px;
`
const OrgListHeaderCount = styled.span`
  font-size: 13px;
  font-weight: 400;
  color: ${({ theme }) => theme.colors.text.secondary};
`
const OrgListHeaderDesc = styled.p`
  margin: 0;
  font-size: 13px;
  color: ${({ theme }) => theme.colors.text.secondary};
  line-height: 1.5;
`
const OrgToolbarRow = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
`
const OrgSearchWrap = styled.div`
  flex: 1;
  min-width: 180px;
  max-width: 260px;
  position: relative;
`
const OrgSearchInput = styled.input`
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
const OrgCreateButton = styled.button`
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
const OrgGrid = styled.div`
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`
const OrgCard = styled.div`
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
const OrgCardContent = styled.div`
  padding: 18px 20px;
`
const OrgEmptyState = styled.div`
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
const OrgModalBoxCustom = styled(ModalBox)`
  max-width: 720px;
  overflow: auto;
  display: flex;
  flex-direction: column;
`
/** 중앙부처 등록·수정 모달 */
const MinistryFormModalBox = styled(ModalBox)`
  max-width: 720px;
  width: 100%;
  overflow: hidden;
  display: flex;
  flex-direction: column;
`
const MinistryFormModalBody = styled(ModalBody)`
  flex: 1;
  min-height: 0;
  max-height: min(78vh, 720px);
  overflow-y: auto;
  padding: 20px 24px 28px;
`

const OrgModalBody = styled.div`
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
const OrgFormDesc = styled.div`
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
const OrgField = styled.div`
  margin-bottom: 20px;
`
const OrgLabel = styled.label`
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  margin-bottom: 8px;
`
const OrgInput = styled.input`
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
const OrgSelect = styled.select`
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
const OrgTextArea = styled.textarea`
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
const OrgErrorText = styled.span`
  font-size: 13px;
  color: #dc2626;
  margin-top: 6px;
  display: block;
`
const OrgFormActions = styled.div`
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  margin-top: 24px;
  padding-top: 20px;
  border-top: 1px solid ${({ theme }) => theme.colors.border.light};
  flex-shrink: 0;
`
const OrgPrimaryBtn = styled.button`
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
const OrgCancelBtn = styled.button`
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

/* 부처 카테고리 모달 — CountrySelectModal·HistoricalCountryFormModal 디자인 참조 */

/* 카테고리 모달 — CategoryBox는 motion 사용 */
const CategoryBox = styled(motion.div)`
  width: 100%;
  max-width: 560px;
  max-height: 88vh;
  display: flex;
  flex-direction: column;
  ${({ theme }) => glassCardMixin(theme)}
  border-radius: 16px;
  z-index: ${Z_INDEX.MODAL_CONTENT};
  overflow: hidden;
`
const CategoryFormBlock = styled.div`
  padding: 28px;
  margin-bottom: 24px;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.04)' : '#f8fafc'};
  border-radius: 12px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
`
const CategorySectionTitle = styled.div`
  font-size: 11px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
  letter-spacing: 0.05em;
  text-transform: uppercase;
  margin-bottom: 16px;
`
const CategoryFormLabel = styled.label`
  display: block;
  margin-bottom: 8px;
  font-size: 13px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
`
const CategoryInput = styled.input`
  width: 100%;
  padding: 14px 16px;
  margin-bottom: 16px;
  font-size: 15px;
  color: ${({ theme }) => theme.colors.text.primary};
  border: 1px solid ${BORDER_COLOR};
  border-radius: 12px;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : '#fff'};
  outline: none;
  box-sizing: border-box;
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease;
  &::placeholder {
    color: ${({ theme }) => theme.colors.text.tertiary};
  }
  &:last-of-type {
    margin-bottom: 20px;
  }
  &:focus {
    border-color: ${MAIN};
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.12);
  }
`
const CategoryBtnRow = styled.div`
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
`
const CategoryPrimaryBtn = styled.button`
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
    cursor: wait;
  }
`
const CategorySecondaryBtn = styled.button`
  padding: 12px 20px;
  font-size: 14px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.secondary};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : '#fff'};
  border: 1px solid ${BORDER_COLOR};
  border-radius: 12px;
  cursor: pointer;
  &:hover {
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.1)' : '#f8fafc'};
  }
`
const CategoryListSectionTitle = styled.div`
  font-size: 11px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
  letter-spacing: 0.05em;
  text-transform: uppercase;
  margin-bottom: 12px;
`
const CategoryList = styled.ul`
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 8px;
`
const CategoryListItem = styled.li`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  gap: 12px;
  border-radius: 10px;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.04)' : '#fff'};
  border: 1px solid ${BORDER_COLOR};
  transition:
    background 0.15s ease,
    border-color 0.15s ease;
  &:hover {
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.08)' : '#f8fafc'};
    border-color: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.2)' : '#cbd5e1'};
  }
`
const CategoryListItemLabel = styled.div`
  flex: 1;
  min-width: 0;
  font-size: 14px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  span {
    color: ${({ theme }) => theme.colors.text.secondary};
    margin-left: 6px;
    font-weight: 500;
    font-size: 13px;
  }
`
const CategoryItemActions = styled.div`
  display: flex;
  gap: 8px;
  flex-shrink: 0;
`
const CategoryEditBtn = styled.button`
  padding: 8px 14px;
  font-size: 13px;
  font-weight: 600;
  color: ${MAIN};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(99,102,241,0.1)' : '#fff'};
  border: 1px solid ${BORDER_COLOR};
  border-radius: 10px;
  cursor: pointer;
  &:hover {
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(99,102,241,0.2)' : '#f8fafc'};
    border-color: rgba(99, 102, 241, 0.3);
  }
`
const CategoryDeleteBtn = styled.button`
  padding: 8px 14px;
  font-size: 13px;
  font-weight: 600;
  color: #dc2626;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(220,38,38,0.1)' : '#fef2f2'};
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(220,38,38,0.3)' : '#fecaca'};
  border-radius: 10px;
  cursor: pointer;
  &:hover {
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(220,38,38,0.18)' : '#fee2e2'};
  }
`
const CategoryEmptyMessage = styled.li`
  padding: 32px 24px;
  font-size: 14px;
  color: ${({ theme }) => theme.colors.text.secondary};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.02)' : '#f8fafc'};
  border-radius: 12px;
  border: 1px dashed
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.1)' : '#e2e8f0'};
  text-align: center;
  line-height: 1.55;
  list-style: none;
`

const SectionLabelDiv = styled.div`
  margin-bottom: 18px;
  font-size: 12px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.tertiary};
  line-height: 1.4;
  letter-spacing: 0.06em;
  text-transform: uppercase;
`

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <SectionLabelDiv>{children}</SectionLabelDiv>
}

/** 폼 행 (레이블 + 컨트롤) */
/** 중앙부처 등록 폼 행 (200px 레이블 컬럼, FieldRow 기반) */
const FormFieldRow = styled(FieldRow)`
  grid-template-columns: 200px 1fr;
  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`
const FormSelectBtn = styled.button<{ $hasValue?: boolean }>`
  width: 100%;
  max-width: 380px;
  padding: 12px 16px;
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.12)' : '#e5e7eb'};
  border-radius: 12px;
  font-size: 14px;
  color: ${(p) =>
    p.$hasValue
      ? p.theme.mode === 'dark'
        ? '#f1f5f9'
        : '#111827'
      : p.theme.mode === 'dark'
        ? '#64748b'
        : '#9ca3af'};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : '#fff'};
  text-align: left;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: space-between;
  transition:
    border-color 0.15s,
    background 0.15s;
  &:hover {
    border-color: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.2)' : '#d1d5db'};
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.08)' : '#fafafa'};
  }
`
const FormTextareaField = styled.textarea`
  width: 100%;
  max-width: 440px;
  padding: 12px 16px;
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.12)' : '#e5e7eb'};
  border-radius: 12px;
  font-size: 14px;
  color: ${({ theme }) => theme.colors.text.primary};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : '#fff'};
  resize: vertical;
  min-height: 72px;
  outline: none;
  font-family: inherit;
  line-height: 1.6;
  transition: border-color 0.15s;
  &::placeholder {
    color: ${({ theme }) => theme.colors.text.tertiary};
  }
  &:focus {
    border-color: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(99,102,241,0.6)' : '#6366f1'};
  }
`
const FormInputField = styled.input`
  width: 100%;
  max-width: 380px;
  padding: 12px 16px;
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.12)' : '#e5e7eb'};
  border-radius: 12px;
  font-size: 14px;
  color: ${({ theme }) => theme.colors.text.primary};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : '#fff'};
  outline: none;
  transition:
    border-color 0.15s,
    background 0.15s;
  &::placeholder {
    color: ${({ theme }) => theme.colors.text.tertiary};
  }
  &:focus {
    border-color: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(99,102,241,0.6)' : '#6366f1'};
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.08)' : '#fff'};
  }
`

/** 부처에 연결된 직위의 역대 장관(재임) 목록 — API로 조회 */
function DepartmentTenuresBlock({ departmentId }: { departmentId: string }) {
  const { mode } = useThemeStore()
  const isDark = mode === 'dark'
  const { data: tenures = [], isLoading } = useQuery({
    queryKey: ['administration-department-tenures', departmentId],
    queryFn: () =>
      administrationDepartmentApi.getTenuresByDepartmentId(departmentId),
    enabled: !!departmentId,
  })
  if (isLoading) return null
  if (tenures.length === 0) return null
  const formatDate = (s: string | null) =>
    s ? s.slice(0, 10).replace(/-/g, '.') : '—'
  const formatName = (
    p: { name?: string; surname?: string; middleName?: string } | null,
  ) => {
    if (!p) return '—'
    const parts = [p.surname, p.middleName, p.name].filter(Boolean)
    return parts.join(' ') || p.name || '—'
  }
  const listEl = (
    <>
      <ul
        style={{
          margin: 0,
          padding: 0,
          listStyle: 'none',
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
        }}
      >
        {tenures.slice(0, 8).map((t) => (
          <li
            key={t.id}
            style={{
              fontSize: 13,
              color: isDark ? '#cbd5e1' : '#374151',
              display: 'flex',
              flexWrap: 'wrap',
              gap: 6,
              alignItems: 'baseline',
            }}
          >
            <span style={{ fontWeight: 600 }}>
              {formatName(
                t.person
                  ? {
                      name: t.person.name,
                      surname: t.person.surname ?? undefined,
                      middleName: t.person.middleName ?? undefined,
                    }
                  : null,
              )}
            </span>
            <span style={{ color: '#94a3b8' }}>
              {t.positionDefinition?.title ?? t.title ?? ''}
            </span>
            <span style={{ color: '#94a3b8', fontSize: 12 }}>
              {formatDate(t.startDate)}–{formatDate(t.endDate)}
            </span>
          </li>
        ))}
      </ul>
      {tenures.length > 8 && (
        <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 6 }}>
          외 {tenures.length - 8}명
        </div>
      )}
    </>
  )

  return (
    <div
      style={{
        marginTop: 16,
        paddingTop: 16,
        borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#e5e7eb'}`,
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: isDark ? '#64748b' : '#64748b',
          letterSpacing: '0.05em',
          textTransform: 'uppercase',
          marginBottom: 10,
        }}
      >
        소속 인사(재임)
      </div>
      {listEl}
    </div>
  )
}

const DEPT_EVENT_TYPE_LABEL: Record<string, string> = {
  PLAN: '계획',
  COORDINATION: '조율',
  POLICY: '정책',
  RESTRUCTURE: '개편',
  OTHER: '기타',
}

/** 부처별 기관 사건(몇 년 몇 월 몇 일 무슨 일) — API로 조회·등록·수정·삭제 */
function DepartmentEventsBlock({ departmentId }: { departmentId: string }) {
  const queryClient = useQueryClient()
  const { mode } = useThemeStore()
  const isDark = mode === 'dark'
  const { data: events = [], isLoading } = useQuery({
    queryKey: ['administration-department-events', departmentId],
    queryFn: () =>
      administrationDepartmentApi.getDepartmentEvents(departmentId),
    enabled: !!departmentId,
  })
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingEvent, setEditingEvent] = useState<
    | import('@/shared/api/administration-department').AdministrationDepartmentEvent
    | null
  >(null)
  const [eventForm, setEventForm] = useState<{
    title: string
    startDate: string | null
    endDate: string | null
    eventType: AdministrationDepartmentEventType
    description: string | null
  }>({
    title: '',
    startDate: null,
    endDate: null,
    eventType: 'OTHER',
    description: null,
  })
  const formatDate = (s: string | null) =>
    s ? s.slice(0, 10).replace(/-/g, '.') : '—'
  const invalidate = () =>
    queryClient.invalidateQueries({
      queryKey: ['administration-department-events', departmentId],
    })

  const handleSaveEvent = async () => {
    if (!eventForm.title.trim()) {
      alert('제목을 입력해주세요.')
      return
    }
    try {
      if (editingEvent) {
        await administrationDepartmentApi.updateEvent(editingEvent.id, {
          title: eventForm.title.trim(),
          startDate: eventForm.startDate || null,
          endDate: eventForm.endDate || null,
          eventType: eventForm.eventType as any,
          description: eventForm.description?.trim() || null,
        })
        alert('수정되었습니다.')
      } else {
        await administrationDepartmentApi.createEvent({
          departmentId,
          title: eventForm.title.trim(),
          startDate: eventForm.startDate || null,
          endDate: eventForm.endDate || null,
          eventType: eventForm.eventType as any,
          description: eventForm.description?.trim() || null,
        })
        alert('등록되었습니다.')
      }
      invalidate()
      setShowAddForm(false)
      setEditingEvent(null)
      setEventForm({
        title: '',
        startDate: null,
        endDate: null,
        eventType: 'OTHER',
        description: null,
      })
    } catch (e) {
      alert(e instanceof Error ? e.message : '저장에 실패했습니다.')
    }
  }

  const addEventButton =
    !showAddForm && !editingEvent ? (
      <button
        type="button"
        onClick={() => {
          setShowAddForm(true)
          setEventForm({
            title: '',
            startDate: null,
            endDate: null,
            eventType: 'OTHER',
            description: null,
          })
        }}
        style={{
          padding: '4px 10px',
          fontSize: 11,
          fontWeight: 600,
          color: MAIN,
          background: 'transparent',
          border: '1px solid ' + MAIN,
          borderRadius: 8,
          cursor: 'pointer',
        }}
      >
        + 사건 추가
      </button>
    ) : null

  const outerStyle = {
    marginTop: 16,
    paddingTop: 16,
    borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#e5e7eb'}`,
  } as const

  const eventsBody = (
    <>
      {isLoading ? (
        <div style={{ fontSize: 12, color: '#94a3b8' }}>불러오는 중…</div>
      ) : (
        <>
          {events.length > 0 && (
            <ul
              style={{
                margin: 0,
                padding: 0,
                listStyle: 'none',
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}
            >
              {events.map((ev) => (
                <li
                  key={ev.id}
                  style={{
                    fontSize: 12,
                    color: isDark ? '#cbd5e1' : '#374151',
                    padding: '8px 10px',
                    background: isDark ? 'rgba(255,255,255,0.04)' : '#fff',
                    borderRadius: 8,
                    border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#e5e7eb'}`,
                  }}
                >
                  {editingEvent?.id === ev.id ? (
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 8,
                      }}
                    >
                      <input
                        value={eventForm.title}
                        onChange={(e) =>
                          setEventForm((f) => ({ ...f, title: e.target.value }))
                        }
                        placeholder="제목"
                        style={{
                          padding: '6px 10px',
                          border: `1px solid ${isDark ? 'rgba(255,255,255,0.12)' : '#e5e7eb'}`,
                          borderRadius: 8,
                          fontSize: 13,
                          background: isDark
                            ? 'rgba(255,255,255,0.06)'
                            : '#fff',
                          color: isDark ? '#f1f5f9' : 'inherit',
                        }}
                      />
                      <div
                        style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}
                      >
                        <input
                          type="date"
                          value={eventForm.startDate ?? ''}
                          onChange={(e) =>
                            setEventForm((f) => ({
                              ...f,
                              startDate: e.target.value || null,
                            }))
                          }
                          style={{
                            padding: '6px 10px',
                            border: `1px solid ${isDark ? 'rgba(255,255,255,0.12)' : '#e5e7eb'}`,
                            borderRadius: 8,
                            fontSize: 12,
                            background: isDark
                              ? 'rgba(255,255,255,0.06)'
                              : '#fff',
                            color: isDark ? '#f1f5f9' : 'inherit',
                          }}
                        />
                        <input
                          type="date"
                          value={eventForm.endDate ?? ''}
                          onChange={(e) =>
                            setEventForm((f) => ({
                              ...f,
                              endDate: e.target.value || null,
                            }))
                          }
                          style={{
                            padding: '6px 10px',
                            border: `1px solid ${isDark ? 'rgba(255,255,255,0.12)' : '#e5e7eb'}`,
                            borderRadius: 8,
                            fontSize: 12,
                            background: isDark
                              ? 'rgba(255,255,255,0.06)'
                              : '#fff',
                            color: isDark ? '#f1f5f9' : 'inherit',
                          }}
                        />
                        <select
                          value={eventForm.eventType}
                          onChange={(e) =>
                            setEventForm((f) => ({
                              ...f,
                              eventType: e.target
                                .value as AdministrationDepartmentEventType,
                            }))
                          }
                          style={{
                            padding: '6px 10px',
                            border: `1px solid ${isDark ? 'rgba(255,255,255,0.12)' : '#e5e7eb'}`,
                            borderRadius: 8,
                            fontSize: 12,
                          }}
                        >
                          {Object.entries(DEPT_EVENT_TYPE_LABEL).map(
                            ([k, v]) => (
                              <option key={k} value={k}>
                                {v}
                              </option>
                            ),
                          )}
                        </select>
                      </div>
                      <textarea
                        value={eventForm.description ?? ''}
                        onChange={(e) =>
                          setEventForm((f) => ({
                            ...f,
                            description: e.target.value || null,
                          }))
                        }
                        placeholder="내용"
                        rows={2}
                        style={{
                          padding: '6px 10px',
                          border: `1px solid ${isDark ? 'rgba(255,255,255,0.12)' : '#e5e7eb'}`,
                          borderRadius: 8,
                          fontSize: 12,
                          resize: 'vertical',
                          background: isDark
                            ? 'rgba(255,255,255,0.06)'
                            : '#fff',
                          color: isDark ? '#f1f5f9' : 'inherit',
                        }}
                      />
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          type="button"
                          onClick={handleSaveEvent}
                          style={{
                            padding: '6px 12px',
                            fontSize: 12,
                            fontWeight: 600,
                            background: MAIN,
                            color: '#fff',
                            border: 'none',
                            borderRadius: 8,
                            cursor: 'pointer',
                          }}
                        >
                          저장
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingEvent(null)
                            setEventForm({
                              title: '',
                              startDate: null,
                              endDate: null,
                              eventType: 'OTHER',
                              description: null,
                            })
                          }}
                          style={{
                            padding: '6px 12px',
                            fontSize: 12,
                            border: `1px solid ${isDark ? 'rgba(255,255,255,0.12)' : '#e5e7eb'}`,
                            borderRadius: 8,
                            background: isDark
                              ? 'rgba(255,255,255,0.06)'
                              : '#fff',
                            color: isDark ? '#cbd5e1' : 'inherit',
                            cursor: 'pointer',
                          }}
                        >
                          취소
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div
                        style={{
                          display: 'flex',
                          flexWrap: 'wrap',
                          alignItems: 'center',
                          gap: 6,
                        }}
                      >
                        <span style={{ fontWeight: 600 }}>{ev.title}</span>
                        <span style={{ fontSize: 11, color: '#94a3b8' }}>
                          {formatDate(ev.startDate)}–{formatDate(ev.endDate)}
                        </span>
                        <span
                          style={{
                            fontSize: 10,
                            padding: '2px 6px',
                            borderRadius: 6,
                            background: isDark
                              ? 'rgba(255,255,255,0.08)'
                              : '#f1f5f9',
                            color: isDark ? '#94a3b8' : '#64748b',
                          }}
                        >
                          {DEPT_EVENT_TYPE_LABEL[ev.eventType] ?? ev.eventType}
                        </span>
                      </div>
                      {ev.description && (
                        <div
                          style={{
                            marginTop: 4,
                            fontSize: 11,
                            color: isDark ? '#64748b' : '#64748b',
                            lineHeight: 1.4,
                          }}
                        >
                          {ev.description.slice(0, 80)}
                          {ev.description.length > 80 ? '…' : ''}
                        </div>
                      )}
                      <div style={{ marginTop: 6, display: 'flex', gap: 6 }}>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingEvent(ev)
                            setEventForm({
                              title: ev.title,
                              startDate: ev.startDate
                                ? ev.startDate.slice(0, 10)
                                : null,
                              endDate: ev.endDate
                                ? ev.endDate.slice(0, 10)
                                : null,
                              eventType: ev.eventType,
                              description: ev.description,
                            })
                          }}
                          style={{
                            padding: '4px 8px',
                            fontSize: 11,
                            border: `1px solid ${isDark ? 'rgba(255,255,255,0.12)' : '#e2e8f0'}`,
                            borderRadius: 6,
                            background: isDark
                              ? 'rgba(255,255,255,0.06)'
                              : '#fff',
                            color: isDark ? '#cbd5e1' : 'inherit',
                            cursor: 'pointer',
                          }}
                        >
                          수정
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm('이 사건을 삭제하시겠습니까?'))
                              administrationDepartmentApi
                                .deleteEvent(ev.id)
                                .then(invalidate)
                          }}
                          style={{
                            padding: '4px 8px',
                            fontSize: 11,
                            border: `1px solid ${isDark ? 'rgba(220,38,38,0.4)' : '#fecaca'}`,
                            borderRadius: 6,
                            background: isDark
                              ? 'rgba(220,38,38,0.12)'
                              : '#fef2f2',
                            color: '#dc2626',
                            cursor: 'pointer',
                          }}
                        >
                          삭제
                        </button>
                      </div>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
          {(showAddForm || (events.length === 0 && !showAddForm)) &&
            showAddForm && (
              <div
                style={{
                  padding: 12,
                  background: isDark ? 'rgba(255,255,255,0.04)' : '#f8fafc',
                  borderRadius: 10,
                  border: `1px dashed ${isDark ? 'rgba(255,255,255,0.1)' : '#e5e7eb'}`,
                  marginTop: 8,
                }}
              >
                <input
                  value={eventForm.title}
                  onChange={(e) =>
                    setEventForm((f) => ({ ...f, title: e.target.value }))
                  }
                  placeholder="제목 *"
                  style={{
                    width: '100%',
                    marginBottom: 8,
                    padding: '8px 12px',
                    border: `1px solid ${isDark ? 'rgba(255,255,255,0.12)' : '#e5e7eb'}`,
                    borderRadius: 8,
                    fontSize: 13,
                    background: isDark ? 'rgba(255,255,255,0.06)' : '#fff',
                    color: isDark ? '#f1f5f9' : 'inherit',
                  }}
                />
                <div
                  style={{
                    display: 'flex',
                    gap: 8,
                    flexWrap: 'wrap',
                    marginBottom: 8,
                  }}
                >
                  <input
                    type="date"
                    value={eventForm.startDate ?? ''}
                    onChange={(e) =>
                      setEventForm((f) => ({
                        ...f,
                        startDate: e.target.value || null,
                      }))
                    }
                    style={{
                      padding: '6px 10px',
                      border: `1px solid ${isDark ? 'rgba(255,255,255,0.12)' : '#e5e7eb'}`,
                      borderRadius: 8,
                      fontSize: 12,
                      background: isDark ? 'rgba(255,255,255,0.06)' : '#fff',
                      color: isDark ? '#f1f5f9' : 'inherit',
                    }}
                  />
                  <input
                    type="date"
                    value={eventForm.endDate ?? ''}
                    onChange={(e) =>
                      setEventForm((f) => ({
                        ...f,
                        endDate: e.target.value || null,
                      }))
                    }
                    style={{
                      padding: '6px 10px',
                      border: `1px solid ${isDark ? 'rgba(255,255,255,0.12)' : '#e5e7eb'}`,
                      borderRadius: 8,
                      fontSize: 12,
                      background: isDark ? 'rgba(255,255,255,0.06)' : '#fff',
                      color: isDark ? '#f1f5f9' : 'inherit',
                    }}
                  />
                  <select
                    value={eventForm.eventType}
                    onChange={(e) =>
                      setEventForm((f) => ({
                        ...f,
                        eventType: e.target
                          .value as AdministrationDepartmentEventType,
                      }))
                    }
                    style={{
                      padding: '6px 10px',
                      border: `1px solid ${isDark ? 'rgba(255,255,255,0.12)' : '#e5e7eb'}`,
                      borderRadius: 8,
                      fontSize: 12,
                      background: isDark ? 'rgba(255,255,255,0.06)' : '#fff',
                      color: isDark ? '#f1f5f9' : 'inherit',
                    }}
                  >
                    {Object.entries(DEPT_EVENT_TYPE_LABEL).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                </div>
                <textarea
                  value={eventForm.description ?? ''}
                  onChange={(e) =>
                    setEventForm((f) => ({
                      ...f,
                      description: e.target.value || null,
                    }))
                  }
                  placeholder="내용 (몇 년 몇 월 몇 일 무슨 일)"
                  rows={2}
                  style={{
                    width: '100%',
                    marginBottom: 8,
                    padding: '8px 12px',
                    border: `1px solid ${isDark ? 'rgba(255,255,255,0.12)' : '#e5e7eb'}`,
                    borderRadius: 8,
                    fontSize: 12,
                    resize: 'vertical',
                    background: isDark ? 'rgba(255,255,255,0.06)' : '#fff',
                    color: isDark ? '#f1f5f9' : 'inherit',
                  }}
                />
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    type="button"
                    onClick={handleSaveEvent}
                    style={{
                      padding: '6px 14px',
                      fontSize: 12,
                      fontWeight: 600,
                      background: MAIN,
                      color: '#fff',
                      border: 'none',
                      borderRadius: 8,
                      cursor: 'pointer',
                    }}
                  >
                    등록
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddForm(false)
                      setEventForm({
                        title: '',
                        startDate: null,
                        endDate: null,
                        eventType: 'OTHER',
                        description: null,
                      })
                    }}
                    style={{
                      padding: '6px 14px',
                      fontSize: 12,
                      border: `1px solid ${isDark ? 'rgba(255,255,255,0.12)' : '#e5e7eb'}`,
                      borderRadius: 8,
                      background: isDark ? 'rgba(255,255,255,0.06)' : '#fff',
                      color: isDark ? '#cbd5e1' : 'inherit',
                      cursor: 'pointer',
                    }}
                  >
                    취소
                  </button>
                </div>
              </div>
            )}
        </>
      )}
    </>
  )

  return (
    <div style={outerStyle}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 8,
          marginBottom: 10,
        }}
      >
        <div
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: isDark ? '#64748b' : '#64748b',
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
          }}
        >
          기관 사건 (연월일·내용)
        </div>
        {addEventButton}
      </div>
      {eventsBody}
    </div>
  )
}

/**
 * 행정조직 통계 대시보드
 * - 전체 조직 통계
 * - 주요 사건 타임라인
 * - 예산/인원 그래프
 * - 조직별 현황
 * - 중앙부처 탭: countryId 있으면 API CRUD(등록/수정/삭제)
 */
const ORGANIZATION_TYPE_LABEL: Record<string, string> = {
  GOVERNMENT_AGENCY: '정부기관/행정기구',
  COMPANY: '기업',
  MILITARY_ACADEMY: '군사학교',
  POLITICAL_PARTY: '정당',
  INTERGOVERNMENTAL_ORG: '국제기구',
  NGO: 'NGO',
  TRADE_UNION: '노동조합',
  MILITARY_ALLIANCE: '군사동맹',
  RELIGIOUS_ORG: '종교단체',
  BUSINESS_ASSOCIATION: '경제단체',
  EDUCATION: '교육기관',
  OTHER: '기타',
}

const ORGANIZATION_TYPE_OPTIONS: { value: OrganizationType; label: string }[] =
  [
    { value: 'GOVERNMENT_AGENCY', label: '정부기관/행정기구' },
    { value: 'COMPANY', label: '기업' },
    { value: 'MILITARY_ACADEMY', label: '군사학교' },
    { value: 'POLITICAL_PARTY', label: '정당' },
    { value: 'INTERGOVERNMENTAL_ORG', label: '국제기구' },
    { value: 'NGO', label: 'NGO' },
    { value: 'TRADE_UNION', label: '노동조합' },
    { value: 'EDUCATION', label: '교육기관' },
    { value: 'OTHER', label: '기타' },
  ]

const ORGANIZATION_SCOPE_OPTIONS: {
  value: import('@/shared/api/organizations').OrganizationScope
  label: string
}[] = [
  { value: 'INTERNATIONAL', label: '국제' },
  { value: 'SUPRANATIONAL', label: '초국가' },
  { value: 'REGIONAL', label: '지역' },
  { value: 'NATIONAL', label: '국가' },
  { value: 'SUBNATIONAL', label: '광역/기초' },
  { value: 'LOCAL', label: '지역/도시' },
]

const GOV_TAB_META: Record<GovernmentContentTab, { label: string }> = {
  heads: {
    label: '역대 수반',
  },
  cabinets: {
    label: '행정부',
  },
  ministries: {
    label: '중앙부처',
  },
  organizations: {
    label: '행정기구',
  },
  positions: {
    label: '직위 정의',
  },
  statistics: {
    label: '통계',
  },
}

export function GovernmentInfoSection({
  country,
  countryId,
  categoryModalOpen: categoryModalOpenProp,
  onCloseCategoryModal,
  onOpenCategoryModal,
  initialContentTab,
}: GovernmentInfoSectionProps) {
  const queryClient = useQueryClient()
  const { mode } = useThemeStore()
  const isDark = mode === 'dark'
  const [contentTab, setContentTab] = useState<GovernmentContentTab>(
    initialContentTab ?? 'heads',
  )
  const effectiveCountryId = countryId ?? country?.id
  const [selectedEventType, setSelectedEventType] = useState<string>('all')

  // 중앙부처 실데이터 (countryId 있을 때만)
  const [ministriesList, setMinistriesList] = useState<
    AdministrationDepartment[]
  >([])
  const [ministriesLoading, setMinistriesLoading] = useState(false)
  /** 'list' = 목록, 'form' = 컨텐츠 영역에 등록/수정 화면 */
  const [ministryFormModalOpen, setMinistryFormModalOpen] = useState(false)
  /** 부처 이름·카테고리 검색 */
  const [ministrySearchQuery, setMinistrySearchQuery] = useState('')
  /** 계층 트리 모드: 상단 탭에서 선택 중인 부처 카테고리 */
  const [ministryTreeCategoryId, setMinistryTreeCategoryId] =
    useState<string>('')
  /** 목록에서 부처 선택 시 상세(행정부 패턴 — 재임·사건·편집은 상세에서만) */
  const [ministryBrowseDepartment, setMinistryBrowseDepartment] =
    useState<AdministrationDepartment | null>(null)
  const [editingMinistry, setEditingMinistry] =
    useState<AdministrationDepartment | null>(null)
  const [ministryForm, setMinistryForm] = useState({
    name: '',
    parentId: '',
    categoryId: '',
    thumbnailUrl: '',
    description: '',
    establishedDate: '',
    abolishedDate: '',
    successorId: '',
    defenseOfficialNameEn: '',
    defenseMissionScope: '',
    defenseHeadquarters: '',
    defenseOrgStructure: '',
    defenseBudgetOrForcesNote: '',
  })
  const [categoriesList, setCategoriesList] = useState<
    AdministrationDepartmentCategory[]
  >([])

  // 카테고리 설정 모달 (헤더에서 열면 부모 state, 아니면 내부 state)
  const [categoryModalOpenLocal, setCategoryModalOpenLocal] = useState(false)
  const categoryModalOpen = categoryModalOpenProp ?? categoryModalOpenLocal
  const closeCategoryModal = () => {
    onCloseCategoryModal?.()
    setCategoryModalOpenLocal(false)
    setEditingCategoryId(null)
    setCategoryForm({ name: '', nameEn: '' })
  }
  const [categoryModalList, setCategoryModalList] = useState<
    AdministrationDepartmentCategory[]
  >([])
  const [categoryForm, setCategoryForm] = useState({ name: '', nameEn: '' })
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(
    null,
  )
  const [categoryFormSaving, setCategoryFormSaving] = useState(false)

  const thumbnailInputRef = useRef<HTMLInputElement>(null)
  const [thumbnailUploading, setThumbnailUploading] = useState(false)
  const [establishedDateModalOpen, setEstablishedDateModalOpen] =
    useState(false)
  const [abolishedDateModalOpen, setAbolishedDateModalOpen] = useState(false)
  const [categorySelectOpen, setCategorySelectOpen] = useState(false)
  const [parentSelectOpen, setParentSelectOpen] = useState(false)
  const [successorSelectOpen, setSuccessorSelectOpen] = useState(false)

  const [organizationModalOpen, setOrganizationModalOpen] = useState(false)
  const [organizationModalError, setOrganizationModalError] = useState<
    string | null
  >(null)
  const [organizationModalSubmitting, setOrganizationModalSubmitting] =
    useState(false)
  const [organizationSearchQuery, setOrganizationSearchQuery] = useState('')
  const [editingOrganization, setEditingOrganization] =
    useState<OrganizationResponseDto | null>(null)
  /** 행정기구 상세 모달 탭: 'info' | 'positions' */
  const [orgModalTab, setOrgModalTab] = useState<'info' | 'positions'>('info')
  /** 행정기구 상세 뷰용 — null이면 목록, 값이 있으면 상세 뷰 */
  const [selectedOrganization, setSelectedOrganization] =
    useState<OrganizationResponseDto | null>(null)
  /** 국가·중앙부처 컨텍스트에서 군부대 등록/수정 모달 */
  const [militaryUnitModalOpen, setMilitaryUnitModalOpen] = useState(false)
  const [militaryUnitEditingId, setMilitaryUnitEditingId] = useState<
    string | null
  >(null)
  const [organizationForm, setOrganizationForm] = useState<{
    name: string
    shortName: string | null
    localName: string | null
    type: OrganizationType
    scope: import('@/shared/api/organizations').OrganizationScope | null
    countryId: string | null
    historicalCountryId: string | null
    description: string | null
    foundedDate: string | null
    dissolvedDate: string | null
    websiteUrl: string | null
    logoUrl: string | null
    ideology: string | null
  }>({
    name: '',
    shortName: null,
    localName: null,
    type: 'GOVERNMENT_AGENCY',
    scope: null,
    countryId: null,
    historicalCountryId: null,
    description: null,
    foundedDate: null,
    dissolvedDate: null,
    websiteUrl: null,
    logoUrl: null,
    ideology: null,
  })

  const loadMinistries = useCallback(() => {
    if (!effectiveCountryId) return
    setMinistriesLoading(true)
    administrationDepartmentApi
      .getByCountryId(effectiveCountryId)
      .then(setMinistriesList)
      .catch(() => setMinistriesList([]))
      .finally(() => setMinistriesLoading(false))
  }, [effectiveCountryId])

  const openMinistryEdit = useCallback((dept: AdministrationDepartment) => {
    setMinistryBrowseDepartment(null)
    setEditingMinistry(dept)
    setMinistryForm(ministryFormFieldsFromDepartment(dept))
    setMinistryFormModalOpen(true)
  }, [])

  const openMinistryCreateChild = useCallback(
    (parent: AdministrationDepartment, categoryId: string) => {
      setMinistryBrowseDepartment(null)
      setEditingMinistry(null)
      setMinistryForm(emptyMinistryFormFields(categoryId, parent.id))
      setMinistryFormModalOpen(true)
    },
    [],
  )

  const openMinistryCreateRootInCategory = useCallback((categoryId: string) => {
    setMinistryBrowseDepartment(null)
    setEditingMinistry(null)
    setMinistryForm(emptyMinistryFormFields(categoryId, ''))
    setMinistryFormModalOpen(true)
  }, [])

  const closeMinistryFormModal = useCallback(() => {
    setMinistryFormModalOpen(false)
    setEditingMinistry(null)
  }, [])

  const submitMinistryForm = useCallback(() => {
    if (!effectiveCountryId) return
    if (!ministryForm.name.trim()) {
      alert('부처명을 입력해주세요.')
      return
    }
    if (!ministryForm.categoryId?.trim()) {
      alert('카테고리를 선택해주세요.')
      return
    }
    const cat = categoriesList.find((c) => c.id === ministryForm.categoryId)
    const defenseCat = isDefenseRelatedCategory(cat ?? null)
    const defensePayload = defenseCat
      ? {
          officialNameEn: ministryForm.defenseOfficialNameEn.trim(),
          missionScope: ministryForm.defenseMissionScope.trim(),
          headquarters: ministryForm.defenseHeadquarters.trim(),
          orgStructure: ministryForm.defenseOrgStructure.trim(),
          budgetOrForcesNote: ministryForm.defenseBudgetOrForcesNote.trim(),
        }
      : null
    const descriptionCombined = buildDepartmentDescription(
      ministryForm.description.trim(),
      defensePayload,
      defenseCat,
    )
    const payload = {
      name: ministryForm.name.trim(),
      parentId: ministryForm.parentId || null,
      categoryId: ministryForm.categoryId || null,
      thumbnailUrl: ministryForm.thumbnailUrl.trim() || null,
      description: descriptionCombined || null,
      establishedDate: ministryForm.establishedDate.trim() || null,
      abolishedDate: ministryForm.abolishedDate.trim() || null,
      successorId: ministryForm.successorId.trim() || null,
    }
    if (editingMinistry) {
      administrationDepartmentApi
        .update(editingMinistry.id, payload)
        .then(() => {
          closeMinistryFormModal()
          loadMinistries()
        })
        .catch((e) =>
          alert(e instanceof Error ? e.message : '수정에 실패했습니다'),
        )
    } else {
      administrationDepartmentApi
        .create({
          ...payload,
          countryId: effectiveCountryId,
        })
        .then(() => {
          closeMinistryFormModal()
          loadMinistries()
        })
        .catch((e) =>
          alert(e instanceof Error ? e.message : '등록에 실패했습니다'),
        )
    }
  }, [
    effectiveCountryId,
    ministryForm,
    editingMinistry,
    categoriesList,
    loadMinistries,
    closeMinistryFormModal,
  ])

  const handleMinistryDelete = useCallback(
    (dept: AdministrationDepartment) => {
      const sub = countDescendantsInDepartmentTree(dept.id, ministriesList)
      const msg =
        sub > 0
          ? `"${dept.name}"을(를) 삭제하면 하위 기관 ${sub}개도 함께 삭제됩니다. 계속하시겠습니까?`
          : `"${dept.name}" 부처를 삭제하시겠습니까?`
      if (confirm(msg)) {
        void administrationDepartmentApi.delete(dept.id).then(() => {
          setMinistryBrowseDepartment((prev) =>
            prev?.id === dept.id ? null : prev,
          )
          loadMinistries()
        })
      }
    },
    [ministriesList, loadMinistries],
  )

  const ministryCategoryDeptCounts = useMemo(
    () => countDepartmentsByCategoryId(ministriesList),
    [ministriesList],
  )

  useEffect(() => {
    if (contentTab === 'ministries') {
      administrationDepartmentApi
        .getCategories()
        .then(setCategoriesList)
        .catch(() => setCategoriesList([]))
      if (effectiveCountryId) loadMinistries()
    }
  }, [contentTab, effectiveCountryId, loadMinistries])

  useEffect(() => {
    if (!categoriesList.length) return
    setMinistryTreeCategoryId((prev) => {
      if (prev && categoriesList.some((c) => c.id === prev)) return prev
      return categoriesList[0].id
    })
  }, [categoriesList])

  useEffect(() => {
    setMinistryBrowseDepartment(null)
  }, [ministryTreeCategoryId])

  useEffect(() => {
    if (!ministryBrowseDepartment) return
    if (!ministriesList.some((d) => d.id === ministryBrowseDepartment.id)) {
      setMinistryBrowseDepartment(null)
    }
  }, [ministriesList, ministryBrowseDepartment])

  const ministryBrowseResolved = useMemo(() => {
    if (!ministryBrowseDepartment) return null
    return (
      ministriesList.find((d) => d.id === ministryBrowseDepartment.id) ??
      ministryBrowseDepartment
    )
  }, [ministriesList, ministryBrowseDepartment])

  /** 목록(탭·검색) 툴바 — 부처 상세일 때는 숨김 */
  const showMinistryListToolbar = useMemo(
    () => !(ministryBrowseResolved && !ministryFormModalOpen),
    [ministryBrowseResolved, ministryFormModalOpen],
  )

  const { data: organizationsList = [], isLoading: organizationsLoading } =
    useQuery({
      queryKey: [
        'organizations-by-country',
        effectiveCountryId,
        country?.type,
        country?.historicalCountries?.map((h) => h.id).join(','),
      ],
      queryFn: async () => {
        if (country?.type === 'historical') {
          return getOrganizations(apiConnection, {
            historicalCountryId: effectiveCountryId ?? undefined,
          })
        }
        const byModern = await getOrganizations(apiConnection, {
          countryId: effectiveCountryId ?? undefined,
        })
        const historicalIds =
          country?.historicalCountries?.map((h) => h.id) ?? []
        const byHistorical = await Promise.all(
          historicalIds.map((hId) =>
            getOrganizations(apiConnection, { historicalCountryId: hId }),
          ),
        )
        const merged = byModern.concat(...byHistorical)
        const seen = new Set<string>()
        return merged.filter((org) => {
          if (seen.has(org.id)) return false
          seen.add(org.id)
          return true
        })
      },
      enabled: !!effectiveCountryId && contentTab === 'organizations',
    })

  const { data: countriesList = [] } = useQuery({
    queryKey: ['countries-for-org-form'],
    queryFn: () => getAllCountries(),
    enabled: contentTab === 'organizations' && organizationModalOpen,
  })
  const { data: historicalCountriesList = [] } = useQuery({
    queryKey: ['historical-countries-for-org-form'],
    queryFn: () => getAllHistoricalCountries(),
    enabled: contentTab === 'organizations' && organizationModalOpen,
  })

  const filteredOrganizationsList = useMemo(() => {
    if (!organizationSearchQuery.trim()) return organizationsList
    const q = organizationSearchQuery.trim().toLowerCase()
    return organizationsList.filter((org) => {
      const name = (org.name ?? '').toLowerCase()
      const shortName = (org.shortName ?? '').toLowerCase()
      const typeLabel = (
        ORGANIZATION_TYPE_LABEL[org.type] ?? org.type
      ).toLowerCase()
      return name.includes(q) || shortName.includes(q) || typeLabel.includes(q)
    })
  }, [organizationsList, organizationSearchQuery])

  const loadCategoryModalList = () => {
    administrationDepartmentApi
      .getCategories()
      .then((list) => {
        setCategoryModalList(list)
        setCategoriesList(list)
      })
      .catch(() => setCategoryModalList([]))
  }

  useEffect(() => {
    if (categoryModalOpen) loadCategoryModalList()
  }, [categoryModalOpen])

  const openCategoryModal = () => {
    setEditingCategoryId(null)
    setCategoryForm({ name: '', nameEn: '' })
    if (onCloseCategoryModal !== undefined) {
      // 부모 제어 시 부모에서 열어주므로 여기선 닫기만
      return
    }
    setCategoryModalOpenLocal(true)
  }

  const saveCategoryForm = async () => {
    if (!categoryForm.name.trim()) {
      alert('카테고리명을 입력해주세요.')
      return
    }
    setCategoryFormSaving(true)
    try {
      if (editingCategoryId) {
        await administrationDepartmentApi.updateCategory(editingCategoryId, {
          name: categoryForm.name.trim(),
          nameEn: categoryForm.nameEn.trim() || null,
        })
      } else {
        await administrationDepartmentApi.createCategory({
          name: categoryForm.name.trim(),
          nameEn: categoryForm.nameEn.trim() || null,
        })
      }
      loadCategoryModalList()
      setEditingCategoryId(null)
      setCategoryForm({ name: '', nameEn: '' })
    } catch (e) {
      alert(e instanceof Error ? e.message : '저장에 실패했습니다.')
    } finally {
      setCategoryFormSaving(false)
    }
  }

  const deleteCategoryById = async (id: string) => {
    if (
      !confirm(
        '이 카테고리를 삭제하시겠습니까? 해당 카테고리를 쓰는 부처는 카테고리가 해제됩니다.',
      )
    )
      return
    try {
      await administrationDepartmentApi.deleteCategory(id)
      loadCategoryModalList()
      if (editingCategoryId === id) {
        setEditingCategoryId(null)
        setCategoryForm({ name: '', nameEn: '' })
      }
    } catch (e) {
      alert(e instanceof Error ? e.message : '삭제에 실패했습니다.')
    }
  }

  // 전체 통계 계산
  const totalMinistries = mockGovernmentData.ministries.length
  const totalConstitutional = mockGovernmentData.constitutionalBodies.length
  const totalAgencies = mockGovernmentData.agencies.length
  const totalLocal = mockGovernmentData.localGovernments.length
  const totalOrganizations =
    totalMinistries + totalConstitutional + totalAgencies + totalLocal

  // 전체 예산 (조원)
  const totalBudget = mockGovernmentData.ministries
    .reduce((sum, ministry) => {
      const budget = parseFloat(ministry.budget.replace(/[^0-9.]/g, ''))
      return sum + budget
    }, 0)
    .toFixed(1)

  // 전체 인원
  const totalEmployees = mockGovernmentData.ministries
    .reduce((sum, ministry) => {
      const employees = parseInt(ministry.employees.replace(/[^0-9]/g, ''))
      return sum + employees
    }, 0)
    .toLocaleString()

  // 모든 사건 수집
  const allEvents: (HistoricalEvent & { orgName: string; orgType: string })[] =
    []

  mockGovernmentData.ministries.forEach((ministry) => {
    if (ministry.events) {
      ministry.events.forEach((event) => {
        allEvents.push({
          ...event,
          orgName: ministry.name,
          orgType: '중앙부처',
        })
      })
    }
  })

  mockGovernmentData.constitutionalBodies.forEach((body) => {
    if (body.events) {
      body.events.forEach((event) => {
        allEvents.push({ ...event, orgName: body.name, orgType: '헌법기관' })
      })
    }
  })

  mockGovernmentData.agencies.forEach((agency) => {
    if (agency.events) {
      agency.events.forEach((event) => {
        allEvents.push({ ...event, orgName: agency.name, orgType: '산하기관' })
      })
    }
  })

  mockGovernmentData.localGovernments.forEach((local) => {
    if (local.events) {
      local.events.forEach((event: HistoricalEvent) => {
        allEvents.push({ ...event, orgName: local.name, orgType: '지방정부' })
      })
    }
  })

  // 연도순 정렬
  allEvents.sort(
    (eventA, eventB) => parseInt(eventB.year) - parseInt(eventA.year),
  )

  // 필터링된 사건
  const filteredEvents =
    selectedEventType === 'all'
      ? allEvents
      : allEvents.filter((event) => event.type === selectedEventType)

  // 사건 타입별 개수
  const eventCounts = {
    all: allEvents.length,
    establishment: allEvents.filter((event) => event.type === 'establishment')
      .length,
    reform: allEvents.filter((event) => event.type === 'reform').length,
    achievement: allEvents.filter((event) => event.type === 'achievement')
      .length,
    crisis: allEvents.filter((event) => event.type === 'crisis').length,
    merger: allEvents.filter((event) => event.type === 'merger').length,
  }

  // 연도별 예산 데이터 (기획재정부 기준)
  const budgetData = mockGovernmentData.ministries[0].statistics || []

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 24,
        padding: '36px 32px 48px',
        minHeight: 'calc(100vh - 200px)',
        position: 'relative',
        width: '100%',
        minWidth: 0,
        boxSizing: 'border-box',
      }}
    >
      {/* 헤더 */}
      <SectionTabHeader
        title="행정조직"
        description="역대 수반, 행정부, 중앙부처, 행정기구를 관리합니다."
        rightSlot={
          onOpenCategoryModal ? (
            <AddButton
              type="button"
              onClick={onOpenCategoryModal}
              aria-label="부처 카테고리 설정"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
              카테고리 설정
            </AddButton>
          ) : undefined
        }
      />

      {/* 탭 내비게이션 */}
      <TabNavigation>
        {(Object.keys(GOV_TAB_META) as GovernmentContentTab[]).map((tabKey) => (
          <TabButton
            key={tabKey}
            type="button"
            $active={contentTab === tabKey}
            onClick={() => setContentTab(tabKey)}
          >
            {GOV_TAB_META[tabKey].label}
          </TabButton>
        ))}
      </TabNavigation>

      {contentTab === 'heads' && country && (
        <section aria-label="역대 수반">
          <HeadsOfStateSection country={country} embedded />
        </section>
      )}

      {contentTab === 'statistics' && (
        <>
          {/* 핵심 수치 요약 */}
          <div
            style={{
              display: 'flex',
              gap: 0,
              borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#e9eef5'}`,
              paddingBottom: 20,
              marginBottom: 4,
            }}
          >
            {[
              { label: '총 인원', value: totalEmployees, unit: '명' },
              { label: '총 예산', value: totalBudget, unit: '조원' },
              { label: '조직 수', value: totalOrganizations, unit: '개' },
              { label: '중앙부처', value: totalMinistries, unit: '개' },
              { label: '헌법기관', value: totalConstitutional, unit: '개' },
            ].map((kpi, i, arr) => (
              <div
                key={i}
                style={{
                  flex: '1 1 0',
                  paddingLeft: i === 0 ? 0 : 24,
                  paddingRight: i < arr.length - 1 ? 24 : 0,
                  borderRight:
                    i < arr.length - 1
                      ? `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : '#f0f4f8'}`
                      : 'none',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 2,
                }}
              >
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: isDark ? '#64748b' : '#94a3b8',
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase' as const,
                  }}
                >
                  {kpi.label}
                </span>
                <span
                  style={{
                    fontSize: 20,
                    fontWeight: 700,
                    color: isDark ? '#f1f5f9' : '#0f172a',
                    letterSpacing: '-0.03em',
                    lineHeight: 1.3,
                  }}
                >
                  {kpi.value}
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 500,
                      color: isDark ? '#475569' : '#94a3b8',
                      marginLeft: 2,
                    }}
                  >
                    {kpi.unit}
                  </span>
                </span>
              </div>
            ))}
          </div>

          {/* 요약 지표 */}
          <section aria-label="행정조직 요약">
            <SectionLabel>요약 지표</SectionLabel>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(5, 1fr)',
                gap: 20,
              }}
            >
              <StatCard
                accentColor={MAIN}
                icon={
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect x="3" y="3" width="7" height="7" />
                    <rect x="14" y="3" width="7" height="7" />
                    <rect x="14" y="14" width="7" height="7" />
                    <rect x="3" y="14" width="7" height="7" />
                  </svg>
                }
                title="전체 조직"
                value={totalOrganizations}
                unit="개"
              />
              <StatCard
                accentColor={ACCENT.teal}
                icon={
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M3 21h18M4 18h16M6 18V9m12 9V9M8 6l4-3 4 3M8 18V6h8v12" />
                  </svg>
                }
                title="중앙부처"
                value={totalMinistries}
                unit="개"
              />
              <StatCard
                accentColor={ACCENT.amber}
                icon={
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
                    <line x1="4" y1="22" x2="4" y2="15" />
                  </svg>
                }
                title="헌법기관"
                value={totalConstitutional}
                unit="개"
              />
              <StatCard
                accentColor={ACCENT.emerald}
                icon={
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
                    <circle cx="9" cy="7" r="4" />
                  </svg>
                }
                title="총 인원"
                value={totalEmployees}
                unit="명"
              />
              <StatCard
                accentColor={ACCENT.sky}
                icon={
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <line x1="12" y1="1" x2="12" y2="23" />
                    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                  </svg>
                }
                title="총 예산"
                value={totalBudget}
                unit="조원"
              />
            </div>
          </section>

          {/* 예산 추이 — 요약 지표 바로 아래 */}
          <section aria-label="국가 예산 추이">
            <SectionLabel>예산 추이</SectionLabel>
            <div
              style={{
                background: isDark ? 'rgba(255,255,255,0.04)' : '#ffffff',
                border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}`,
                borderRadius: 24,
                padding: 28,
                boxShadow: isDark
                  ? '0 2px 8px rgba(0,0,0,0.3)'
                  : '0 2px 8px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 24,
                  flexWrap: 'wrap',
                  gap: 12,
                }}
              >
                <p
                  style={{
                    margin: 0,
                    fontSize: 13,
                    color: isDark ? '#94a3b8' : '#78716c',
                    fontWeight: 500,
                  }}
                >
                  최근 6년간 예산 변화 (단위: 조원)
                </p>
                {budgetData.length > 0 && (
                  <span
                    style={{
                      fontSize: 12,
                      color: isDark ? '#64748b' : '#a8a29e',
                      fontWeight: 500,
                    }}
                  >
                    최대 {Math.max(...budgetData.map((s) => s.budget || 0))}조원
                  </span>
                )}
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-end',
                  gap: 16,
                  height: 260,
                  padding: '0 8px 8px',
                  position: 'relative',
                }}
              >
                {/* Y축 눈금 배경 */}
                <div
                  style={{
                    position: 'absolute',
                    left: 0,
                    right: 0,
                    top: 0,
                    bottom: 32,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    pointerEvents: 'none',
                  }}
                >
                  {[100, 75, 50, 25].map((pct) => (
                    <div
                      key={pct}
                      style={{
                        width: '100%',
                        height: 1,
                        background: isDark
                          ? 'rgba(255,255,255,0.06)'
                          : 'rgba(0,0,0,0.06)',
                        marginLeft: 8,
                        marginRight: 8,
                      }}
                    />
                  ))}
                </div>
                {budgetData.map((stat, idx) => {
                  const maxBudget = Math.max(
                    ...budgetData.map((s) => s.budget || 0),
                    1,
                  )
                  const height = maxBudget
                    ? ((stat.budget || 0) / maxBudget) * 200
                    : 0
                  const prevBudget =
                    idx > 0 ? budgetData[idx - 1].budget || 0 : 0
                  const currBudget = stat.budget || 0
                  const isUp = currBudget > prevBudget
                  const pctChange = prevBudget
                    ? Math.abs((currBudget - prevBudget) / prevBudget) * 100
                    : 0
                  return (
                    <div
                      key={idx}
                      style={{
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 10,
                        position: 'relative',
                        zIndex: 1,
                      }}
                    >
                      <div
                        style={{
                          width: '100%',
                          maxWidth: 72,
                          minHeight: 32,
                          height: `${Math.max(height, 32)}px`,
                          background: `linear-gradient(180deg, ${MAIN} 0%, rgba(99, 102, 241, 0.75) 70%, rgba(99, 102, 241, 0.5) 100%)`,
                          borderRadius: '12px 12px 0 0',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'flex-start',
                          padding: '10px 6px',
                          color: '#ffffff',
                          fontSize: 14,
                          fontWeight: 700,
                          boxShadow: '0 2px 12px rgba(99, 102, 241, 0.25)',
                          transition:
                            'transform 0.2s ease, box-shadow 0.2s ease',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = 'translateY(-4px)'
                          e.currentTarget.style.boxShadow =
                            '0 8px 24px rgba(99, 102, 241, 0.35)'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'translateY(0)'
                          e.currentTarget.style.boxShadow =
                            '0 2px 12px rgba(99, 102, 241, 0.25)'
                        }}
                      >
                        {stat.budget}조
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: 2,
                        }}
                      >
                        <span
                          style={{
                            fontSize: 14,
                            fontWeight: 600,
                            color: '#1c1917',
                          }}
                        >
                          {stat.year}
                        </span>
                        {idx > 0 && prevBudget > 0 && (
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 600,
                              color: isUp ? ACCENT.emerald : '#78716c',
                            }}
                          >
                            {isUp ? '↑' : '↓'} {pctChange.toFixed(1)}%
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </section>

          {/* 좌: 타임라인 | 우: 조직 유형별 현황 — 5:5 */}
          <section
            aria-label="타임라인 및 조직 유형"
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 24,
              alignItems: 'start',
            }}
          >
            {/* 좌측: 주요 사건 타임라인 */}
            <div style={{ minWidth: 0 }}>
              <SectionLabel>주요 사건</SectionLabel>
              <div
                style={{
                  background: isDark ? 'rgba(255,255,255,0.04)' : '#ffffff',
                  border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}`,
                  borderRadius: 24,
                  padding: 28,
                  boxShadow: isDark
                    ? '0 2px 8px rgba(0,0,0,0.3)'
                    : '0 2px 8px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: 24,
                    flexWrap: 'wrap',
                    gap: 20,
                  }}
                >
                  <div
                    style={{ display: 'flex', alignItems: 'center', gap: 14 }}
                  >
                    <div
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: 16,
                        background: 'rgba(99, 102, 241, 0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: MAIN,
                      }}
                    >
                      <svg
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <circle cx="12" cy="12" r="10" />
                        <polyline points="12 6 12 12 16 14" />
                      </svg>
                    </div>
                    <div>
                      <h3
                        style={{
                          fontSize: 17,
                          fontWeight: 600,
                          color: isDark ? '#f1f5f9' : '#1c1917',
                          margin: 0,
                          letterSpacing: '-0.02em',
                        }}
                      >
                        타임라인
                      </h3>
                      <p
                        style={{
                          fontSize: 13,
                          color: isDark ? '#94a3b8' : '#78716c',
                          margin: '2px 0 0',
                        }}
                      >
                        행정조직 관련 주요 사건
                      </p>
                    </div>
                  </div>

                  {/* 사건 타입 필터 — 세그먼트 스타일 */}
                  <div
                    style={{
                      display: 'flex',
                      gap: 0,
                      flexWrap: 'wrap',
                      padding: 4,
                      background: isDark ? 'rgba(255,255,255,0.06)' : '#f5f5f4',
                      borderRadius: 14,
                      border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}`,
                    }}
                  >
                    {[
                      { key: 'all', label: '전체', count: eventCounts.all },
                      {
                        key: 'establishment',
                        label: '설립',
                        count: eventCounts.establishment,
                      },
                      {
                        key: 'reform',
                        label: '개혁',
                        count: eventCounts.reform,
                      },
                      {
                        key: 'achievement',
                        label: '성과',
                        count: eventCounts.achievement,
                      },
                      {
                        key: 'crisis',
                        label: '위기',
                        count: eventCounts.crisis,
                      },
                      {
                        key: 'merger',
                        label: '통합',
                        count: eventCounts.merger,
                      },
                    ].map((filter) => (
                      <button
                        key={filter.key}
                        onClick={() => setSelectedEventType(filter.key)}
                        style={{
                          padding: '8px 14px',
                          borderRadius: 10,
                          border: 'none',
                          background:
                            selectedEventType === filter.key
                              ? isDark
                                ? 'rgba(255,255,255,0.1)'
                                : '#ffffff'
                              : 'transparent',
                          color:
                            selectedEventType === filter.key
                              ? isDark
                                ? '#f1f5f9'
                                : '#1c1917'
                              : isDark
                                ? '#94a3b8'
                                : '#57534e',
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          boxShadow:
                            selectedEventType === filter.key
                              ? '0 1px 3px rgba(0,0,0,0.08)'
                              : 'none',
                        }}
                        onMouseEnter={(e) => {
                          if (selectedEventType !== filter.key) {
                            e.currentTarget.style.background = isDark
                              ? 'rgba(255,255,255,0.08)'
                              : 'rgba(255,255,255,0.6)'
                            e.currentTarget.style.color = isDark
                              ? '#f1f5f9'
                              : '#1c1917'
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (selectedEventType !== filter.key) {
                            e.currentTarget.style.background = 'transparent'
                            e.currentTarget.style.color = isDark
                              ? '#94a3b8'
                              : '#57534e'
                          }
                        }}
                      >
                        {filter.label}
                        <span
                          style={{
                            fontSize: 10,
                            background:
                              selectedEventType === filter.key
                                ? MAIN
                                : isDark
                                  ? 'rgba(255,255,255,0.1)'
                                  : 'rgba(0,0,0,0.08)',
                            color:
                              selectedEventType === filter.key
                                ? '#ffffff'
                                : isDark
                                  ? '#94a3b8'
                                  : '#57534e',
                            padding: '2px 6px',
                            borderRadius: 8,
                            fontWeight: 700,
                          }}
                        >
                          {filter.count}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 사건 리스트 — 세로 타임라인 (축선 + 노드 + 카드) */}
                <div
                  style={{
                    position: 'relative',
                    maxHeight: 560,
                    overflowY: 'auto',
                    paddingRight: 4,
                  }}
                  className="government-events-list"
                >
                  {filteredEvents.length === 0 ? (
                    <div
                      style={{
                        padding: '48px 24px',
                        textAlign: 'center',
                        fontSize: 14,
                        color: '#78716c',
                        background: '#fafaf9',
                        borderRadius: 18,
                        border: '1px dashed rgba(0,0,0,0.1)',
                      }}
                    >
                      해당 조건의 사건이 없습니다.
                    </div>
                  ) : (
                    <>
                      {/* 세로 축선 */}
                      <div
                        style={{
                          position: 'absolute',
                          left: 23,
                          top: 12,
                          bottom: 12,
                          width: 2,
                          background: `linear-gradient(180deg, ${MAIN} 0%, transparent 100%)`,
                          borderRadius: 1,
                          opacity: 0.8,
                        }}
                        aria-hidden
                      />
                      {filteredEvents.slice(0, 20).map((event, idx) => {
                        const eventWithImages = event as typeof event & {
                          images?: string[]
                        }
                        const imageUrl =
                          eventWithImages.images?.[0] ??
                          mockGovernmentData.ministries.find(
                            (m) => m.name === event.orgName,
                          )?.images?.[0]
                        return (
                          <div
                            key={idx}
                            style={{
                              display: 'flex',
                              alignItems: 'flex-start',
                              gap: 0,
                              position: 'relative',
                              paddingBottom: 20,
                            }}
                          >
                            {/* 타임라인 노드 (연도) */}
                            <div
                              style={{
                                width: 48,
                                flexShrink: 0,
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                paddingTop: 14,
                              }}
                            >
                              <div
                                style={{
                                  width: 14,
                                  height: 14,
                                  borderRadius: '50%',
                                  background: isDark
                                    ? 'rgba(255,255,255,0.1)'
                                    : '#ffffff',
                                  border: `3px solid ${MAIN}`,
                                  boxShadow: '0 0 0 2px rgba(0,0,0,0.08)',
                                  flexShrink: 0,
                                }}
                              />
                              <span
                                style={{
                                  fontSize: 11,
                                  fontWeight: 700,
                                  color: MAIN,
                                  marginTop: 6,
                                  letterSpacing: '-0.02em',
                                }}
                              >
                                {event.year}
                              </span>
                            </div>

                            {/* 카드 */}
                            <div
                              style={{
                                flex: 1,
                                minWidth: 0,
                                background: isDark
                                  ? 'rgba(255,255,255,0.04)'
                                  : '#ffffff',
                                borderRadius: 18,
                                border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}`,
                                overflow: 'hidden',
                                transition: 'all 0.2s ease',
                                boxShadow: isDark
                                  ? '0 2px 8px rgba(0,0,0,0.3)'
                                  : '0 2px 8px rgba(0,0,0,0.04)',
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.boxShadow = isDark
                                  ? '0 8px 24px rgba(0,0,0,0.4)'
                                  : '0 8px 24px rgba(0,0,0,0.08)'
                                e.currentTarget.style.borderColor = MAIN
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.boxShadow = isDark
                                  ? '0 2px 8px rgba(0,0,0,0.3)'
                                  : '0 2px 8px rgba(0,0,0,0.04)'
                                e.currentTarget.style.borderColor = isDark
                                  ? 'rgba(255,255,255,0.08)'
                                  : 'rgba(0,0,0,0.06)'
                              }}
                            >
                              <div
                                style={{
                                  display: 'flex',
                                  flexDirection: 'row',
                                  minHeight: 88,
                                }}
                              >
                                <div
                                  style={{
                                    width: 100,
                                    minWidth: 100,
                                    flexShrink: 0,
                                    background: imageUrl
                                      ? `url(${imageUrl}) center/cover`
                                      : `linear-gradient(135deg, #e7e5e4 0%, ${MAIN} 100%)`,
                                  }}
                                />
                                <div
                                  style={{
                                    padding: '12px 14px 14px',
                                    flex: 1,
                                    minWidth: 0,
                                  }}
                                >
                                  <div
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: 8,
                                      marginBottom: 6,
                                      flexWrap: 'wrap',
                                    }}
                                  >
                                    {event.orgName && (
                                      <span
                                        style={{
                                          fontSize: 11,
                                          fontWeight: 600,
                                          color: isDark ? '#94a3b8' : '#57534e',
                                          background: isDark
                                            ? 'rgba(255,255,255,0.08)'
                                            : '#f5f5f4',
                                          padding: '4px 8px',
                                          borderRadius: 8,
                                        }}
                                      >
                                        {event.orgName}
                                      </span>
                                    )}
                                    <span
                                      style={{
                                        fontSize: 10,
                                        fontWeight: 600,
                                        color: isDark ? '#64748b' : '#78716c',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.04em',
                                      }}
                                    >
                                      {event.type === 'establishment' && '설립'}
                                      {event.type === 'reform' && '개혁'}
                                      {event.type === 'achievement' && '성과'}
                                      {event.type === 'crisis' && '위기'}
                                      {event.type === 'merger' && '통합'}
                                    </span>
                                  </div>
                                  <h4
                                    style={{
                                      fontSize: 14,
                                      fontWeight: 700,
                                      color: isDark ? '#f1f5f9' : '#292524',
                                      margin: '0 0 4px',
                                      lineHeight: 1.35,
                                    }}
                                  >
                                    {event.title}
                                  </h4>
                                  <p
                                    style={{
                                      fontSize: 12,
                                      color: isDark ? '#94a3b8' : '#57534e',
                                      lineHeight: 1.5,
                                      margin: 0,
                                      display: '-webkit-box',
                                      WebkitLineClamp: 2,
                                      WebkitBoxOrient: 'vertical',
                                      overflow: 'hidden',
                                    }}
                                  >
                                    {event.description}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* 우측: 조직 유형별 현황 2x2 */}
            <div style={{ minWidth: 0 }}>
              <SectionLabel>조직 유형별 현황</SectionLabel>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 20,
                }}
              >
                <OrgTypeCard
                  accentColor={MAIN}
                  title="중앙행정기관"
                  count={totalMinistries}
                  description="18개 부처"
                  examples={['기획재정부', '외교부', '국방부']}
                />
                <OrgTypeCard
                  accentColor={ACCENT.teal}
                  title="헌법기관"
                  count={totalConstitutional}
                  description="5개 기관"
                  examples={['국회', '대법원', '헌법재판소']}
                />
                <OrgTypeCard
                  accentColor={ACCENT.amber}
                  title="산하기관"
                  count={totalAgencies}
                  description="8개 기관"
                  examples={['국세청', '관세청', '경찰청']}
                />
                <OrgTypeCard
                  accentColor={ACCENT.sky}
                  title="지방자치단체"
                  count={totalLocal}
                  description="4개 시/도"
                  examples={['서울시', '경기도', '부산시']}
                />
              </div>
            </div>
          </section>
        </>
      )}

      {contentTab === 'ministries' && (
        <section aria-label="중앙부처 현황">
          {showMinistryListToolbar ? (
            <div
              style={{
                marginBottom: 18,
                paddingBottom: 18,
                borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.07)' : '#eceff3'}`,
                display: 'flex',
                flexDirection: 'column',
                gap: 14,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  gap: 12,
                  flexWrap: 'wrap',
                }}
              >
                <div>
                  <h3
                    style={{
                      margin: 0,
                      fontSize: 20,
                      fontWeight: 700,
                      color: isDark ? '#f1f5f9' : '#0f172a',
                      letterSpacing: '-0.03em',
                    }}
                  >
                    중앙부처
                  </h3>
                  <p
                    style={{
                      margin: '6px 0 0',
                      fontSize: 13,
                      color: isDark ? '#94a3b8' : '#64748b',
                      lineHeight: 1.45,
                      maxWidth: 520,
                    }}
                  >
                    카테고리 선택 → 목록에서 부처 클릭 → 상세에서
                    재임·사건·편집.
                  </p>
                </div>
                {effectiveCountryId ? (
                  <button
                    type="button"
                    onClick={() => {
                      setMinistryBrowseDepartment(null)
                      setEditingMinistry(null)
                      setMinistryForm(emptyMinistryFormFields('', ''))
                      setMinistryFormModalOpen(true)
                    }}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '10px 16px',
                      border: 'none',
                      background: MAIN,
                      color: '#fff',
                      borderRadius: 10,
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: 'pointer',
                      flexShrink: 0,
                      boxShadow: '0 2px 10px rgba(99, 102, 241, 0.28)',
                    }}
                  >
                    <FiPlus size={16} />
                    부처 등록
                  </button>
                ) : null}
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '10px 14px',
                  borderRadius: 12,
                  border: `1px solid ${isDark ? 'rgba(255,255,255,0.09)' : '#e2e8f0'}`,
                  background: isDark ? 'rgba(255,255,255,0.03)' : '#fafbfc',
                }}
              >
                <FiSearch
                  size={18}
                  style={{
                    color: isDark ? '#94a3b8' : '#64748b',
                    flexShrink: 0,
                  }}
                  aria-hidden
                />
                <input
                  type="search"
                  value={ministrySearchQuery}
                  onChange={(e) => setMinistrySearchQuery(e.target.value)}
                  placeholder="부처명·카테고리 검색…"
                  aria-label="부처 이름 검색"
                  style={{
                    flex: 1,
                    minWidth: 0,
                    padding: '4px 2px',
                    fontSize: 14,
                    border: 'none',
                    background: 'transparent',
                    color: isDark ? '#f1f5f9' : '#0f172a',
                    outline: 'none',
                  }}
                />
              </div>
            </div>
          ) : null}
          {!effectiveCountryId ? (
            <div
              style={{
                padding: 56,
                textAlign: 'center',
                color: isDark ? '#64748b' : '#6b7280',
                fontSize: 14,
                background: isDark ? 'rgba(255,255,255,0.03)' : '#f9fafb',
                borderRadius: 16,
                border: `1px dashed ${isDark ? 'rgba(255,255,255,0.1)' : '#e5e7eb'}`,
              }}
            >
              국가를 선택하면 부처를 등록할 수 있습니다.
            </div>
          ) : ministriesLoading ? (
            <div
              style={{
                padding: 56,
                textAlign: 'center',
                color: isDark ? '#64748b' : '#6b7280',
                fontSize: 14,
                background: isDark ? 'rgba(255,255,255,0.03)' : '#f9fafb',
                borderRadius: 16,
                border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#e5e7eb'}`,
              }}
            >
              불러오는 중…
            </div>
          ) : categoriesList.length === 0 ? (
            /* 카테고리가 없으면 행정부처럼 등록 유도 카드 1개 표시 (중앙부처 화면에 아무것도 안 나오는 문제 해결) */
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              <div
                style={{
                  padding: '48px 32px',
                  background: isDark ? 'rgba(255,255,255,0.04)' : '#fff',
                  borderRadius: 20,
                  border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#e5e7eb'}`,
                  boxShadow: isDark
                    ? '0 2px 8px rgba(0,0,0,0.3)'
                    : '0 2px 8px rgba(0,0,0,0.04)',
                  textAlign: 'center',
                }}
              >
                <div
                  style={{
                    width: 64,
                    height: 64,
                    margin: '0 auto 20px',
                    borderRadius: 20,
                    background:
                      'linear-gradient(145deg, rgba(99, 102, 241, 0.12) 0%, rgba(99, 102, 241, 0.06) 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: MAIN,
                  }}
                >
                  <FiPlus size={28} strokeWidth={2.5} />
                </div>
                <h3
                  style={{
                    margin: '0 0 8px',
                    fontSize: 19,
                    fontWeight: 700,
                    color: isDark ? '#f1f5f9' : '#0f172a',
                    letterSpacing: '-0.02em',
                  }}
                >
                  등록된 부처 카테고리가 없습니다
                </h3>
                <p
                  style={{
                    margin: '0 0 24px',
                    fontSize: 14,
                    color: isDark ? '#64748b' : '#64748b',
                    lineHeight: 1.5,
                    maxWidth: 420,
                    marginLeft: 'auto',
                    marginRight: 'auto',
                  }}
                >
                  먼저 카테고리를 추가한 뒤, 해당 카테고리에 부처를 등록하세요.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    openCategoryModal()
                  }}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '14px 24px',
                    fontSize: 15,
                    fontWeight: 600,
                    color: '#fff',
                    background: MAIN,
                    border: 'none',
                    borderRadius: 14,
                    cursor: 'pointer',
                    boxShadow: '0 4px 14px rgba(99, 102, 241, 0.35)',
                  }}
                >
                  <FiGrid size={16} /> 카테고리 관리
                </button>
              </div>
            </div>
          ) : (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 14,
              }}
            >
              {ministryBrowseResolved && !ministryFormModalOpen ? (
                <motion.div
                  key="ministry-detail"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  style={{
                    padding: '0',
                    minHeight: 280,
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                  <MinistryDepartmentDetailView
                    department={ministryBrowseResolved}
                    isDark={isDark}
                    categoryLabel={
                      categoriesList.find(
                        (c) => c.id === ministryBrowseResolved.categoryId,
                      )?.name ?? null
                    }
                    isDefenseRelated={(() => {
                      const c = categoriesList.find(
                        (x) => x.id === ministryBrowseResolved.categoryId,
                      )
                      const ko = c?.name ?? ''
                      const en = c?.nameEn ?? ''
                      return (
                        /국방|군사|국군|전쟁|합참/i.test(ko) ||
                        /defense|military|armed|forces|war/i.test(en)
                      )
                    })()}
                    onRegisterMilitaryUnit={
                      effectiveCountryId
                        ? () => {
                            setMilitaryUnitEditingId(null)
                            setMilitaryUnitModalOpen(true)
                          }
                        : undefined
                    }
                    onEditMilitaryUnit={(unitId) => {
                      setMilitaryUnitEditingId(unitId)
                      setMilitaryUnitModalOpen(true)
                    }}
                    onBack={() => {
                      setMinistrySearchQuery('')
                      setMinistryBrowseDepartment(null)
                    }}
                    onEdit={() => openMinistryEdit(ministryBrowseResolved)}
                    onDelete={() =>
                      handleMinistryDelete(ministryBrowseResolved)
                    }
                    onAddChild={() =>
                      openMinistryCreateChild(
                        ministryBrowseResolved,
                        ministryBrowseResolved.categoryId ?? '',
                      )
                    }
                    onGoToPositions={() => {
                      setMinistrySearchQuery('')
                      setMinistryBrowseDepartment(null)
                      setContentTab('positions')
                    }}
                    tenuresSlot={
                      <DepartmentTenuresBlock
                        departmentId={ministryBrowseResolved.id}
                      />
                    }
                    eventsSlot={
                      <DepartmentEventsBlock
                        departmentId={ministryBrowseResolved.id}
                      />
                    }
                  />
                </motion.div>
              ) : (
                <>
                  <MinistryCategoryTabBar
                    categories={categoriesList}
                    counts={ministryCategoryDeptCounts}
                    selectedCategoryId={ministryTreeCategoryId}
                    onSelectCategory={setMinistryTreeCategoryId}
                    isDark={isDark}
                  />
                  {(() => {
                    const cat =
                      categoriesList.find(
                        (c) => c.id === ministryTreeCategoryId,
                      ) ?? categoriesList[0]
                    if (!cat) return null
                    const deptsInCat = ministriesList.filter(
                      (d) => d.categoryId === cat.id,
                    )
                    const deptsInCatFiltered = filterDepartmentsBySearchQuery(
                      deptsInCat,
                      ministrySearchQuery,
                    )
                    return (
                      <div
                        role="tabpanel"
                        id={`ministry-cat-panel-${cat.id}`}
                        aria-labelledby={`ministry-cat-tab-${cat.id}`}
                        style={{
                          minHeight: 260,
                          maxHeight: 'min(70vh, 680px)',
                          display: 'flex',
                          flexDirection: 'column',
                          paddingTop: 4,
                        }}
                      >
                        <div
                          style={{
                            flex: 1,
                            minHeight: 0,
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 0,
                            overflowY: 'auto',
                            WebkitOverflowScrolling: 'touch',
                          }}
                        >
                          {deptsInCat.length === 0 ? (
                            <div
                              style={{
                                flex: 1,
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 18,
                                padding: '40px 20px 48px',
                                textAlign: 'center',
                              }}
                            >
                              <div
                                style={{
                                  width: 72,
                                  height: 72,
                                  borderRadius: 22,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  background: isDark
                                    ? 'linear-gradient(145deg, rgba(99,102,241,0.22), rgba(99,102,241,0.08))'
                                    : 'linear-gradient(145deg, #eef2ff, #f5f3ff)',
                                  color: isDark ? '#a5b4fc' : MAIN,
                                  boxShadow: isDark
                                    ? 'inset 0 1px 0 rgba(255,255,255,0.06)'
                                    : '0 8px 24px rgba(99, 102, 241, 0.12)',
                                }}
                                aria-hidden
                              >
                                <FiBriefcase size={30} strokeWidth={1.75} />
                              </div>
                              <div
                                style={{
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: 8,
                                  maxWidth: 320,
                                }}
                              >
                                <span
                                  style={{
                                    fontSize: 16,
                                    fontWeight: 700,
                                    letterSpacing: '-0.03em',
                                    color: isDark ? '#f1f5f9' : '#0f172a',
                                  }}
                                >
                                  등록된 부처가 없습니다
                                </span>
                                <span
                                  style={{
                                    fontSize: 13,
                                    lineHeight: 1.55,
                                    color: isDark ? '#94a3b8' : '#64748b',
                                  }}
                                >
                                  이 카테고리에 첫 부처를 등록하면 목록과 계층이
                                  여기에 표시됩니다.
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() =>
                                  openMinistryCreateRootInCategory(cat.id)
                                }
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 8,
                                  padding: '11px 20px',
                                  fontSize: 13,
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                  border: 'none',
                                  borderRadius: 12,
                                  background: MAIN,
                                  color: '#fff',
                                  boxShadow:
                                    '0 4px 14px rgba(99, 102, 241, 0.35)',
                                }}
                              >
                                <FiPlus size={16} strokeWidth={2.25} />
                                부처 등록
                              </button>
                            </div>
                          ) : deptsInCatFiltered.length === 0 ? (
                            <MinistryDeptSearchEmpty
                              isDark={isDark}
                              onClearSearch={() => setMinistrySearchQuery('')}
                            />
                          ) : (
                            <MinistryDepartmentTree
                              allDepartments={ministriesList}
                              departmentsInCategory={deptsInCatFiltered}
                              isDark={isDark}
                              selectedDepartmentId={
                                ministryBrowseDepartment?.id
                              }
                              onSelectDepartment={(d) =>
                                setMinistryBrowseDepartment(d)
                              }
                              onAddRoot={() =>
                                openMinistryCreateRootInCategory(cat.id)
                              }
                              onGoToPositionDefinitions={() =>
                                setContentTab('positions')
                              }
                            />
                          )}
                        </div>
                      </div>
                    )
                  })()}
                </>
              )}
            </div>
          )}
        </section>
      )}

      {contentTab === 'ministries' &&
        effectiveCountryId &&
        ministryFormModalOpen &&
        createPortal(
          <>
            <ModalOverlay
              role="dialog"
              aria-modal="true"
              aria-labelledby="ministry-form-modal-title"
              onClick={(e) => {
                if (e.target === e.currentTarget) closeMinistryFormModal()
              }}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.2 }}
                onClick={(e) => e.stopPropagation()}
              >
                <MinistryFormModalBox>
                  <ModalHeader>
                    <ModalTitle id="ministry-form-modal-title">
                      {editingMinistry ? '부처 수정' : '부처 등록'}
                    </ModalTitle>
                    <div
                      style={{
                        display: 'flex',
                        gap: 10,
                        alignItems: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <button
                        type="button"
                        onClick={submitMinistryForm}
                        style={{
                          padding: '10px 20px',
                          background: MAIN,
                          color: '#fff',
                          border: 'none',
                          borderRadius: 10,
                          fontSize: 13,
                          fontWeight: 600,
                          cursor: 'pointer',
                          boxShadow: '0 2px 8px rgba(99,102,241,0.25)',
                        }}
                      >
                        {editingMinistry ? '저장' : '등록'}
                      </button>
                      <ModalCloseButton
                        type="button"
                        onClick={closeMinistryFormModal}
                        aria-label="닫기"
                      >
                        <FiX size={22} strokeWidth={2} />
                      </ModalCloseButton>
                    </div>
                  </ModalHeader>
                  <MinistryFormModalBody>
                    <input
                      ref={thumbnailInputRef}
                      type="file"
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={async (e) => {
                        const file = e.target.files?.[0]
                        if (!file) return
                        e.target.value = ''
                        try {
                          validateImageFile(file)
                          setThumbnailUploading(true)
                          const res = await uploadImage(file, 'ministries')
                          setMinistryForm((f) => ({
                            ...f,
                            thumbnailUrl: res.url,
                          }))
                        } catch (err) {
                          alert(
                            err instanceof Error
                              ? err.message
                              : '이미지 업로드에 실패했습니다.',
                          )
                        } finally {
                          setThumbnailUploading(false)
                        }
                      }}
                    />

                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 24,
                      }}
                    >
                      <FormFieldRow>
                        <FieldLabel>썸네일</FieldLabel>
                        <div
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 8,
                          }}
                        >
                          <div
                            role="button"
                            tabIndex={0}
                            onClick={() => thumbnailInputRef.current?.click()}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault()
                                thumbnailInputRef.current?.click()
                              }
                            }}
                            style={{
                              width: '100%',
                              maxWidth: 280,
                              aspectRatio: '16/10',
                              borderRadius: 14,
                              border: `2px dashed ${isDark ? 'rgba(255,255,255,0.15)' : '#e5e7eb'}`,
                              background: ministryForm.thumbnailUrl
                                ? 'transparent'
                                : isDark
                                  ? 'rgba(255,255,255,0.04)'
                                  : '#fafafa',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              overflow: 'hidden',
                              cursor: thumbnailUploading ? 'wait' : 'pointer',
                            }}
                          >
                            {thumbnailUploading ? (
                              <span style={{ fontSize: 13, color: '#94a3b8' }}>
                                업로드 중…
                              </span>
                            ) : ministryForm.thumbnailUrl ? (
                              <img
                                src={getUploadImageUrl(
                                  ministryForm.thumbnailUrl,
                                )}
                                alt=""
                                style={{
                                  width: '100%',
                                  height: '100%',
                                  objectFit: 'cover',
                                }}
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none'
                                }}
                              />
                            ) : (
                              <span style={{ fontSize: 13, color: '#94a3b8' }}>
                                이미지 선택
                              </span>
                            )}
                          </div>
                          {ministryForm.thumbnailUrl && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                setMinistryForm((f) => ({
                                  ...f,
                                  thumbnailUrl: '',
                                }))
                              }}
                              style={{
                                alignSelf: 'flex-start',
                                marginTop: 4,
                                padding: '6px 12px',
                                fontSize: 12,
                                border: `1px solid ${isDark ? 'rgba(255,255,255,0.12)' : '#e2e8f0'}`,
                                borderRadius: 10,
                                background: isDark
                                  ? 'rgba(255,255,255,0.06)'
                                  : '#fff',
                                color: isDark ? '#94a3b8' : '#64748b',
                                cursor: 'pointer',
                              }}
                            >
                              제거
                            </button>
                          )}
                        </div>
                      </FormFieldRow>

                      <FormFieldRow>
                        <FieldLabel>
                          부처명 <span style={{ color: '#ef4444' }}>*</span>
                        </FieldLabel>
                        <div
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 6,
                          }}
                        >
                          <FormInputField
                            value={ministryForm.name}
                            onChange={(e) =>
                              setMinistryForm((f) => ({
                                ...f,
                                name: e.target.value,
                              }))
                            }
                            placeholder="예: 기획재정부"
                          />
                        </div>
                      </FormFieldRow>

                      <FormFieldRow>
                        <FieldLabel>
                          카테고리 <span style={{ color: '#ef4444' }}>*</span>
                        </FieldLabel>
                        <div
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 6,
                          }}
                        >
                          <FormSelectBtn
                            type="button"
                            $hasValue={!!ministryForm.categoryId}
                            onClick={() => setCategorySelectOpen(true)}
                          >
                            <span>
                              {ministryForm.categoryId
                                ? (categoriesList.find(
                                    (c) => c.id === ministryForm.categoryId,
                                  )?.name ?? '')
                                : '선택'}
                            </span>
                            <svg
                              width="18"
                              height="18"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              style={{
                                flexShrink: 0,
                                marginLeft: 8,
                                opacity: 0.5,
                              }}
                            >
                              <path d="M6 9l6 6 6-6" />
                            </svg>
                          </FormSelectBtn>
                          <span style={{ fontSize: 12, color: '#94a3b8' }}>
                            같은 카테고리에 여러 부처 등록 가능 (예:
                            전쟁부·국방부)
                          </span>
                        </div>
                      </FormFieldRow>

                      <FormFieldRow>
                        <FieldLabel>상위 부처</FieldLabel>
                        <div
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 6,
                          }}
                        >
                          <FormSelectBtn
                            type="button"
                            $hasValue={!!ministryForm.parentId}
                            onClick={() => setParentSelectOpen(true)}
                          >
                            <span>
                              {ministryForm.parentId
                                ? (ministriesList.find(
                                    (d) => d.id === ministryForm.parentId,
                                  )?.name ?? '')
                                : '선택'}
                            </span>
                            <svg
                              width="18"
                              height="18"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              style={{
                                flexShrink: 0,
                                marginLeft: 8,
                                opacity: 0.5,
                              }}
                            >
                              <path d="M6 9l6 6 6-6" />
                            </svg>
                          </FormSelectBtn>
                        </div>
                      </FormFieldRow>

                      <FormFieldRow>
                        <FieldLabel>설립일 · 폐지일</FieldLabel>
                        <div
                          style={{
                            display: 'flex',
                            flexDirection: 'row',
                            gap: 10,
                            flexWrap: 'wrap',
                          }}
                        >
                          <button
                            type="button"
                            onClick={() => setEstablishedDateModalOpen(true)}
                            style={{
                              padding: '10px 18px',
                              border: `1px solid ${isDark ? 'rgba(255,255,255,0.12)' : '#e5e7eb'}`,
                              borderRadius: 12,
                              fontSize: 13,
                              color: ministryForm.establishedDate
                                ? isDark
                                  ? '#f1f5f9'
                                  : '#111827'
                                : isDark
                                  ? '#64748b'
                                  : '#9ca3af',
                              background: ministryForm.establishedDate
                                ? isDark
                                  ? 'rgba(59,130,246,0.12)'
                                  : '#eff6ff'
                                : isDark
                                  ? 'rgba(255,255,255,0.06)'
                                  : '#fff',
                              cursor: 'pointer',
                              minWidth: 140,
                            }}
                          >
                            {ministryForm.establishedDate
                              ? ministryForm.establishedDate.replace(/-/g, '.')
                              : '설립일 선택'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setAbolishedDateModalOpen(true)}
                            style={{
                              padding: '10px 18px',
                              border: `1px solid ${isDark ? 'rgba(255,255,255,0.12)' : '#e5e7eb'}`,
                              borderRadius: 12,
                              fontSize: 13,
                              color: ministryForm.abolishedDate
                                ? isDark
                                  ? '#f1f5f9'
                                  : '#111827'
                                : isDark
                                  ? '#64748b'
                                  : '#9ca3af',
                              background: ministryForm.abolishedDate
                                ? isDark
                                  ? 'rgba(239,68,68,0.12)'
                                  : '#fef2f2'
                                : isDark
                                  ? 'rgba(255,255,255,0.06)'
                                  : '#fff',
                              cursor: 'pointer',
                              minWidth: 140,
                            }}
                          >
                            {ministryForm.abolishedDate
                              ? ministryForm.abolishedDate.replace(/-/g, '.')
                              : '폐지일 선택'}
                          </button>
                        </div>
                      </FormFieldRow>

                      <FormFieldRow>
                        <FieldLabel>후신 부처</FieldLabel>
                        <div
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 6,
                          }}
                        >
                          <FormSelectBtn
                            type="button"
                            $hasValue={!!ministryForm.successorId}
                            onClick={() => setSuccessorSelectOpen(true)}
                          >
                            <span>
                              {ministryForm.successorId
                                ? (ministriesList.find(
                                    (d) => d.id === ministryForm.successorId,
                                  )?.name ?? '')
                                : '선택'}
                            </span>
                            <svg
                              width="18"
                              height="18"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              style={{
                                flexShrink: 0,
                                marginLeft: 8,
                                opacity: 0.5,
                              }}
                            >
                              <path d="M6 9l6 6 6-6" />
                            </svg>
                          </FormSelectBtn>
                        </div>
                      </FormFieldRow>

                      <FormFieldRow>
                        <FieldLabel>설명</FieldLabel>
                        <div
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 6,
                          }}
                        >
                          <FormTextareaField
                            value={ministryForm.description}
                            onChange={(e) =>
                              setMinistryForm((f) => ({
                                ...f,
                                description: e.target.value,
                              }))
                            }
                            placeholder="역할, 담당 업무 등"
                            rows={2}
                          />
                        </div>
                      </FormFieldRow>

                      {isDefenseRelatedCategory(
                        categoriesList.find(
                          (c) => c.id === ministryForm.categoryId,
                        ) ?? null,
                      ) ? (
                        <>
                          <div
                            style={{
                              marginTop: 8,
                              paddingTop: 22,
                              borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#e9eef5'}`,
                            }}
                          >
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 10,
                                marginBottom: 18,
                              }}
                            >
                              <span
                                style={{
                                  fontSize: 15,
                                  fontWeight: 700,
                                  color: isDark ? '#e2e8f0' : '#0f172a',
                                  letterSpacing: '-0.02em',
                                }}
                              >
                                국방·군사 기관 추가 정보
                              </span>
                              <span
                                style={{
                                  fontSize: 11,
                                  fontWeight: 700,
                                  letterSpacing: '0.04em',
                                  textTransform: 'uppercase',
                                  color: isDark ? '#a5b4fc' : '#4338ca',
                                  padding: '4px 10px',
                                  borderRadius: 8,
                                  background: isDark
                                    ? 'rgba(99,102,241,0.15)'
                                    : '#eef2ff',
                                  border: `1px solid ${isDark ? 'rgba(165,180,252,0.25)' : '#c7d2fe'}`,
                                }}
                              >
                                선택
                              </span>
                            </div>
                            <p
                              style={{
                                margin: '0 0 18px',
                                fontSize: 12.5,
                                color: isDark ? '#94a3b8' : '#64748b',
                                lineHeight: 1.55,
                              }}
                            >
                              영문 명칭, 관할, 본부, 지휘체계 등을 나누어 적으면
                              상세 화면에서 카드로 정리되어 보입니다. 저장 시
                              설명 필드에 함께 기록됩니다.
                            </p>
                          </div>

                          <FormFieldRow>
                            <FieldLabel>영문·공식 명칭</FieldLabel>
                            <div
                              style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 6,
                              }}
                            >
                              <FormInputField
                                value={ministryForm.defenseOfficialNameEn}
                                onChange={(e) =>
                                  setMinistryForm((f) => ({
                                    ...f,
                                    defenseOfficialNameEn: e.target.value,
                                  }))
                                }
                                placeholder="e.g. Ministry of National Defense"
                              />
                            </div>
                          </FormFieldRow>

                          <FormFieldRow>
                            <FieldLabel>주요 임무·관할</FieldLabel>
                            <div
                              style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 6,
                              }}
                            >
                              <FormTextareaField
                                value={ministryForm.defenseMissionScope}
                                onChange={(e) =>
                                  setMinistryForm((f) => ({
                                    ...f,
                                    defenseMissionScope: e.target.value,
                                  }))
                                }
                                placeholder="국방 정책 수립, 군 통수, 예산·전력 등"
                                rows={3}
                              />
                            </div>
                          </FormFieldRow>

                          <FormFieldRow>
                            <FieldLabel>본부·주요 거점</FieldLabel>
                            <div
                              style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 6,
                              }}
                            >
                              <FormTextareaField
                                value={ministryForm.defenseHeadquarters}
                                onChange={(e) =>
                                  setMinistryForm((f) => ({
                                    ...f,
                                    defenseHeadquarters: e.target.value,
                                  }))
                                }
                                placeholder="예: 서울 용산, 세종 등"
                                rows={2}
                              />
                            </div>
                          </FormFieldRow>

                          <FormFieldRow>
                            <FieldLabel>지휘·산하 구조</FieldLabel>
                            <div
                              style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 6,
                              }}
                            >
                              <FormTextareaField
                                value={ministryForm.defenseOrgStructure}
                                onChange={(e) =>
                                  setMinistryForm((f) => ({
                                    ...f,
                                    defenseOrgStructure: e.target.value,
                                  }))
                                }
                                placeholder="합참, 육·해·공군 본부, 국직 부대 등 관계"
                                rows={3}
                              />
                            </div>
                          </FormFieldRow>

                          <FormFieldRow>
                            <FieldLabel>국방비·병력·기타 참고</FieldLabel>
                            <div
                              style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 6,
                              }}
                            >
                              <FormTextareaField
                                value={ministryForm.defenseBudgetOrForcesNote}
                                onChange={(e) =>
                                  setMinistryForm((f) => ({
                                    ...f,
                                    defenseBudgetOrForcesNote: e.target.value,
                                  }))
                                }
                                placeholder="공개 가능한 수준의 참고 수치·비고"
                                rows={2}
                              />
                            </div>
                          </FormFieldRow>
                        </>
                      ) : null}
                    </div>
                  </MinistryFormModalBody>
                </MinistryFormModalBox>
              </motion.div>
            </ModalOverlay>
            <DatePickerModal
              isOpen={establishedDateModalOpen}
              onClose={() => setEstablishedDateModalOpen(false)}
              onSelect={(date) => {
                setMinistryForm((f) => ({ ...f, establishedDate: date }))
                setEstablishedDateModalOpen(false)
                setAbolishedDateModalOpen(true)
              }}
              initialDate={ministryForm.establishedDate || undefined}
              title="설립일 선택"
            />
            <DatePickerModal
              isOpen={abolishedDateModalOpen}
              onClose={() => setAbolishedDateModalOpen(false)}
              onSelect={(date) => {
                setMinistryForm((f) => ({ ...f, abolishedDate: date }))
                setAbolishedDateModalOpen(false)
              }}
              initialDate={ministryForm.abolishedDate || undefined}
              title="폐지일 선택"
            />
            <SelectModal
              isOpen={categorySelectOpen}
              onClose={() => setCategorySelectOpen(false)}
              title="카테고리 선택"
              options={
                categoriesList.map((c) => ({
                  value: c.id,
                  label: `${c.name}${c.nameEn ? ` (${c.nameEn})` : ''}`,
                })) as SelectOption[]
              }
              selectedValue={ministryForm.categoryId || undefined}
              onSelect={(id) => {
                setMinistryForm((f) => ({ ...f, categoryId: id }))
                setCategorySelectOpen(false)
              }}
            />
            <SelectModal
              isOpen={parentSelectOpen}
              onClose={() => setParentSelectOpen(false)}
              title="상위 부처 선택"
              options={
                [
                  { value: '', label: '없음' },
                  ...ministriesList
                    .filter(
                      (d) => !editingMinistry || d.id !== editingMinistry.id,
                    )
                    .map((d) => ({ value: d.id, label: d.name })),
                ] as SelectOption[]
              }
              selectedValue={ministryForm.parentId}
              onSelect={(id) => {
                setMinistryForm((f) => ({ ...f, parentId: id }))
                setParentSelectOpen(false)
              }}
            />
            <SelectModal
              isOpen={successorSelectOpen}
              onClose={() => setSuccessorSelectOpen(false)}
              title="후신 부처 선택"
              options={
                [
                  { value: '', label: '없음' },
                  ...ministriesList
                    .filter(
                      (d) => !editingMinistry || d.id !== editingMinistry.id,
                    )
                    .map((d) => ({ value: d.id, label: d.name })),
                ] as SelectOption[]
              }
              selectedValue={ministryForm.successorId}
              onSelect={(id) => {
                setMinistryForm((f) => ({ ...f, successorId: id }))
                setSuccessorSelectOpen(false)
              }}
            />
          </>,
          document.body,
        )}
      {contentTab === 'positions' && country && (
        <section aria-label="직위 정의(관직)">
          <PositionDefinitionsSection />
        </section>
      )}

      {contentTab === 'cabinets' && country && (
        <section
          aria-label="행정부(역대 내각)"
          style={{
            flex: 1,
            minHeight: 0,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <CabinetsSection
            country={country}
            onOpenMinistriesTab={(categoryId) => {
              setContentTab('ministries')
              setEditingMinistry(null)
              setMinistryForm(emptyMinistryFormFields(categoryId ?? '', ''))
              setMinistryFormModalOpen(true)
            }}
          />
        </section>
      )}

      {contentTab === 'organizations' && (
        <section aria-label="행정기구(조직)">
          {selectedOrganization ? (
            /* ── 상세 뷰 ── */
            <>
              {/* 헤더: 뒤로가기 + 조직명 + 액션 버튼 */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                  paddingBottom: 20,
                  marginBottom: 24,
                  borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#e9eef5'}`,
                  flexWrap: 'wrap',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedOrganization(null)
                      setEditingOrganization(null)
                      setOrganizationModalError(null)
                    }}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '8px 14px',
                      fontSize: 13,
                      fontWeight: 600,
                      color: isDark ? '#94a3b8' : '#64748b',
                      background: 'transparent',
                      border: 'none',
                      borderRadius: 12,
                      cursor: 'pointer',
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.background = isDark
                        ? 'rgba(255,255,255,0.08)'
                        : '#f1f5f9'
                      e.currentTarget.style.color = isDark
                        ? '#cbd5e1'
                        : '#475569'
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.background = 'transparent'
                      e.currentTarget.style.color = isDark
                        ? '#94a3b8'
                        : '#64748b'
                    }}
                  >
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M19 12H5M12 19l-7-7 7-7" />
                    </svg>
                    목록으로
                  </button>
                  <h2
                    style={{
                      margin: 0,
                      fontSize: 20,
                      fontWeight: 700,
                      color: isDark ? '#f1f5f9' : '#111827',
                      letterSpacing: '-0.025em',
                    }}
                  >
                    {selectedOrganization.name}
                    {selectedOrganization.shortName && (
                      <span
                        style={{
                          fontSize: 14,
                          fontWeight: 500,
                          color: '#94a3b8',
                          marginLeft: 8,
                        }}
                      >
                        ({selectedOrganization.shortName})
                      </span>
                    )}
                  </h2>
                </div>
                {/* 액션 버튼 */}
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingOrganization(selectedOrganization)
                      setOrganizationForm({
                        name: selectedOrganization.name,
                        shortName: selectedOrganization.shortName,
                        localName: selectedOrganization.localName,
                        type: selectedOrganization.type,
                        scope: selectedOrganization.scope,
                        countryId: selectedOrganization.countryId,
                        historicalCountryId:
                          selectedOrganization.historicalCountryId,
                        description: selectedOrganization.description,
                        foundedDate: selectedOrganization.foundedDate
                          ? selectedOrganization.foundedDate.slice(0, 10)
                          : null,
                        dissolvedDate: selectedOrganization.dissolvedDate
                          ? selectedOrganization.dissolvedDate.slice(0, 10)
                          : null,
                        websiteUrl: selectedOrganization.websiteUrl,
                        logoUrl: selectedOrganization.logoUrl,
                        ideology: selectedOrganization.ideology,
                      })
                      setOrganizationModalError(null)
                      setOrganizationModalOpen(true)
                    }}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '9px 16px',
                      fontSize: 13,
                      fontWeight: 600,
                      color: isDark ? '#94a3b8' : '#475569',
                      background: isDark ? 'rgba(255,255,255,0.06)' : '#fff',
                      border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : '#e2e8f0'}`,
                      borderRadius: 10,
                      cursor: 'pointer',
                    }}
                  >
                    <FiGrid size={13} />
                    수정
                  </button>
                  <button
                    type="button"
                    onClick={() => setOrgModalTab('positions')}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '9px 16px',
                      fontSize: 13,
                      fontWeight: 600,
                      color: isDark ? '#a5b4fc' : '#4f46e5',
                      background: isDark ? 'rgba(99,102,241,0.15)' : '#eef2ff',
                      border: `1px solid ${isDark ? 'rgba(99,102,241,0.4)' : '#c7d2fe'}`,
                      borderRadius: 10,
                      cursor: 'pointer',
                    }}
                  >
                    <FiAward size={13} />
                    직위 설정
                  </button>
                </div>
              </div>

              {/* 조직 기본 정보 표시 */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                  gap: 16,
                  marginBottom: 24,
                }}
              >
                {[
                  {
                    label: '유형',
                    value:
                      ORGANIZATION_TYPE_LABEL[selectedOrganization.type] ??
                      selectedOrganization.type,
                  },
                  {
                    label: '설립일',
                    value: selectedOrganization.foundedDate
                      ? selectedOrganization.foundedDate.slice(0, 10)
                      : '—',
                  },
                  {
                    label: '해체일',
                    value: selectedOrganization.dissolvedDate
                      ? selectedOrganization.dissolvedDate.slice(0, 10)
                      : '—',
                  },
                  {
                    label: '로컬명',
                    value: selectedOrganization.localName ?? '—',
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    style={{
                      background: isDark ? 'rgba(255,255,255,0.05)' : '#f8fafc',
                      borderRadius: 12,
                      padding: '14px 16px',
                      border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#f1f5f9'}`,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        color: '#94a3b8',
                        marginBottom: 6,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                      }}
                    >
                      {item.label}
                    </div>
                    <div
                      style={{
                        fontSize: 14,
                        fontWeight: 600,
                        color: isDark ? '#f1f5f9' : '#0f172a',
                      }}
                    >
                      {item.value}
                    </div>
                  </div>
                ))}
              </div>
              {selectedOrganization.description && (
                <div
                  style={{
                    background: isDark ? 'rgba(255,255,255,0.05)' : '#f8fafc',
                    borderRadius: 12,
                    padding: '16px 18px',
                    border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#f1f5f9'}`,
                    marginBottom: 24,
                  }}
                >
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: '#94a3b8',
                      marginBottom: 8,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                    }}
                  >
                    설명
                  </div>
                  <p
                    style={{
                      margin: 0,
                      fontSize: 14,
                      color: isDark ? '#cbd5e1' : '#374151',
                      lineHeight: 1.6,
                    }}
                  >
                    {selectedOrganization.description}
                  </p>
                </div>
              )}
            </>
          ) : (
            /* ── 목록 뷰 ── */
            <>
              {!effectiveCountryId ? (
                <>
                  <SectionLabel>행정기구·조직</SectionLabel>
                  <p
                    style={{
                      fontSize: 14,
                      color: isDark ? '#64748b' : '#64748b',
                    }}
                  >
                    현대 국가를 선택하면 해당 국가 소속 조직을 등록·조회할 수
                    있습니다.
                  </p>
                </>
              ) : organizationsLoading ? (
                <>
                  <SectionLabel>행정기구·조직</SectionLabel>
                  <p
                    style={{
                      fontSize: 14,
                      color: isDark ? '#64748b' : '#64748b',
                    }}
                  >
                    불러오는 중…
                  </p>
                </>
              ) : (
                <>
                  {organizationsList.length === 0 ? (
                    /* 행정부와 동일: 등록 카드만 표시 (추가 버튼 없음) */
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 24,
                      }}
                    >
                      <div
                        style={{
                          padding: '48px 32px',
                          background: isDark
                            ? 'rgba(255,255,255,0.04)'
                            : '#fff',
                          borderRadius: 20,
                          border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#e5e7eb'}`,
                          boxShadow: isDark
                            ? '0 2px 8px rgba(0,0,0,0.3)'
                            : '0 2px 8px rgba(0,0,0,0.04)',
                          textAlign: 'center',
                        }}
                      >
                        <div
                          style={{
                            width: 64,
                            height: 64,
                            margin: '0 auto 20px',
                            borderRadius: 20,
                            background:
                              'linear-gradient(145deg, rgba(99, 102, 241, 0.12) 0%, rgba(99, 102, 241, 0.06) 100%)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: MAIN,
                          }}
                        >
                          <FiPlus size={28} strokeWidth={2.5} />
                        </div>
                        <h3
                          style={{
                            margin: '0 0 8px',
                            fontSize: 20,
                            fontWeight: 700,
                            color: isDark ? '#f1f5f9' : '#0f172a',
                            letterSpacing: '-0.02em',
                          }}
                        >
                          등록된 조직이 없습니다
                        </h3>
                        <p
                          style={{
                            margin: '0 0 24px',
                            fontSize: 14,
                            color: isDark ? '#64748b' : '#64748b',
                            lineHeight: 1.5,
                            maxWidth: 400,
                            marginLeft: 'auto',
                            marginRight: 'auto',
                          }}
                        >
                          만철·관동군·총독부 등 행정기구·조직을 등록하면 이 국가
                          소속으로 관리할 수 있습니다.
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingOrganization(null)
                            setOrganizationForm({
                              name: '',
                              shortName: null,
                              localName: null,
                              type: 'GOVERNMENT_AGENCY',
                              scope: null,
                              countryId: effectiveCountryId,
                              historicalCountryId: null,
                              description: null,
                              foundedDate: null,
                              dissolvedDate: null,
                              websiteUrl: null,
                              logoUrl: null,
                              ideology: null,
                            })
                            setOrganizationModalOpen(true)
                          }}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 8,
                            padding: '14px 24px',
                            fontSize: 15,
                            fontWeight: 600,
                            color: '#fff',
                            background: MAIN,
                            border: 'none',
                            borderRadius: 14,
                            cursor: 'pointer',
                            boxShadow: '0 4px 14px rgba(99, 102, 241, 0.35)',
                          }}
                        >
                          <FiPlus size={18} /> 조직 등록
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <OrgListHeader>
                        <OrgListHeaderRow>
                          <OrgListHeaderTitleBlock>
                            <OrgListHeaderTitle>
                              행정기구·조직
                              <OrgListHeaderCount>
                                {filteredOrganizationsList.length}개
                                {organizationSearchQuery.trim()
                                  ? ` / 전체 ${organizationsList.length}개`
                                  : ''}
                              </OrgListHeaderCount>
                            </OrgListHeaderTitle>
                            <OrgListHeaderDesc>
                              이름·약칭·유형으로 검색할 수 있습니다.
                            </OrgListHeaderDesc>
                          </OrgListHeaderTitleBlock>
                        </OrgListHeaderRow>
                        <OrgToolbarRow>
                          <OrgSearchWrap style={{ position: 'relative' }}>
                            <span
                              style={{
                                position: 'absolute',
                                left: 12,
                                top: '50%',
                                transform: 'translateY(-50%)',
                                color: '#94a3b8',
                                pointerEvents: 'none',
                              }}
                            >
                              <FiSearch size={16} />
                            </span>
                            <OrgSearchInput
                              type="search"
                              placeholder="이름, 약칭, 유형 검색"
                              value={organizationSearchQuery}
                              onChange={(e) =>
                                setOrganizationSearchQuery(e.target.value)
                              }
                              aria-label="조직 검색"
                            />
                          </OrgSearchWrap>
                        </OrgToolbarRow>
                      </OrgListHeader>
                      {filteredOrganizationsList.length === 0 ? (
                        <OrgEmptyState>
                          검색 조건에 맞는 조직이 없습니다.
                        </OrgEmptyState>
                      ) : (
                        <OrgGrid>
                          {/* 행정부처럼 첫 카드: 조직 등록 카드 */}
                          <OrgCard
                            as="button"
                            type="button"
                            onClick={() => {
                              setEditingOrganization(null)
                              setOrganizationForm({
                                name: '',
                                shortName: null,
                                localName: null,
                                type: 'GOVERNMENT_AGENCY',
                                scope: null,
                                countryId: effectiveCountryId,
                                historicalCountryId: null,
                                description: null,
                                foundedDate: null,
                                dissolvedDate: null,
                                websiteUrl: null,
                                logoUrl: null,
                                ideology: null,
                              })
                              setOrganizationModalOpen(true)
                            }}
                            style={{
                              borderStyle: 'dashed',
                              cursor: 'pointer',
                              textAlign: 'left',
                              minHeight: 120,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <OrgCardContent
                              style={{
                                width: '100%',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: 8,
                              }}
                            >
                              <div
                                style={{
                                  width: 48,
                                  height: 48,
                                  borderRadius: 14,
                                  background: 'rgba(99, 102, 241, 0.1)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  color: MAIN,
                                }}
                              >
                                <FiPlus size={24} />
                              </div>
                              <span
                                style={{
                                  fontSize: 14,
                                  fontWeight: 600,
                                  color: isDark ? '#94a3b8' : '#64748b',
                                }}
                              >
                                조직 등록
                              </span>
                            </OrgCardContent>
                          </OrgCard>
                          {filteredOrganizationsList.map(
                            (org: OrganizationResponseDto) => (
                              <OrgCard
                                key={org.id}
                                as="button"
                                type="button"
                                onClick={() => {
                                  setOrgModalTab('info')
                                  setOrganizationModalError(null)
                                  setSelectedOrganization(org)
                                }}
                                style={{
                                  cursor: 'pointer',
                                  textAlign: 'left',
                                  width: '100%',
                                }}
                              >
                                <OrgCardContent>
                                  <div
                                    style={{
                                      display: 'flex',
                                      justifyContent: 'space-between',
                                      alignItems: 'flex-start',
                                      gap: 12,
                                    }}
                                  >
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                      <h3
                                        style={{
                                          margin: 0,
                                          fontSize: 16,
                                          fontWeight: 600,
                                          color: isDark ? '#f1f5f9' : '#0f172a',
                                          letterSpacing: '-0.01em',
                                          lineHeight: 1.35,
                                        }}
                                      >
                                        {org.name}
                                      </h3>
                                      <div
                                        style={{
                                          marginTop: 6,
                                          fontSize: 13,
                                          color: isDark ? '#94a3b8' : '#64748b',
                                        }}
                                      >
                                        {ORGANIZATION_TYPE_LABEL[org.type] ??
                                          org.type}
                                        {(org.foundedDate ||
                                          org.dissolvedDate) && (
                                          <span
                                            style={{
                                              display: 'block',
                                              marginTop: 4,
                                            }}
                                          >
                                            {org.foundedDate &&
                                              `설립 ${org.foundedDate.slice(0, 10)}`}
                                            {org.foundedDate &&
                                              org.dissolvedDate &&
                                              ' ~ '}
                                            {org.dissolvedDate &&
                                              `해체 ${org.dissolvedDate.slice(0, 10)}`}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                    <div
                                      style={{
                                        color: '#cbd5e1',
                                        flexShrink: 0,
                                      }}
                                    >
                                      <svg
                                        width="16"
                                        height="16"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                      >
                                        <path d="M9 18l6-6-6-6" />
                                      </svg>
                                    </div>
                                  </div>
                                </OrgCardContent>
                              </OrgCard>
                            ),
                          )}
                        </OrgGrid>
                      )}
                    </>
                  )}
                </>
              )}
            </>
          )}

          {organizationModalOpen &&
            createPortal(
              <ModalOverlay
                role="dialog"
                aria-modal="true"
                aria-labelledby="org-modal-title"
                onClick={(e) => {
                  if (e.target === e.currentTarget) {
                    setOrganizationModalOpen(false)
                    setOrganizationModalError(null)
                  }
                }}
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.2 }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <OrgModalBoxCustom>
                    <ModalHeader>
                      <ModalTitle id="org-modal-title">
                        <FiGrid size={24} strokeWidth={2} />
                        {editingOrganization
                          ? editingOrganization.name
                          : '조직 등록'}
                      </ModalTitle>
                      <ModalCloseButton
                        type="button"
                        onClick={() => {
                          setOrganizationModalOpen(false)
                          setOrganizationModalError(null)
                        }}
                        aria-label="닫기"
                      >
                        <FiX size={22} strokeWidth={2} />
                      </ModalCloseButton>
                    </ModalHeader>
                    <ModalBody>
                      <OrgFormDesc>
                        <FiInfo size={20} />
                        <span>
                          기본 정보를 입력하세요. 소속 국가는 현재 보고 있는
                          국가로 미리 설정됩니다.
                        </span>
                      </OrgFormDesc>
                      <form
                        onSubmit={async (e) => {
                          e.preventDefault()
                          setOrganizationModalError(null)
                          if (!organizationForm.name.trim()) {
                            setOrganizationModalError('이름을 입력해주세요.')
                            return
                          }
                          setOrganizationModalSubmitting(true)
                          try {
                            const body = {
                              name: organizationForm.name.trim(),
                              shortName:
                                organizationForm.shortName?.trim() || null,
                              localName:
                                organizationForm.localName?.trim() || null,
                              type: organizationForm.type,
                              scope: organizationForm.scope || null,
                              countryId: organizationForm.countryId || null,
                              historicalCountryId:
                                organizationForm.historicalCountryId || null,
                              description:
                                organizationForm.description?.trim() || null,
                              foundedDate:
                                organizationForm.foundedDate?.trim() || null,
                              dissolvedDate:
                                organizationForm.dissolvedDate?.trim() || null,
                              websiteUrl:
                                organizationForm.websiteUrl?.trim() || null,
                              logoUrl: organizationForm.logoUrl?.trim() || null,
                              ideology:
                                organizationForm.ideology?.trim() || null,
                            }
                            if (editingOrganization) {
                              await updateOrganization(
                                apiConnection,
                                editingOrganization.id,
                                body,
                              )
                              toast.success('수정되었습니다.')
                              if (
                                selectedOrganization?.id ===
                                editingOrganization.id
                              ) {
                                setSelectedOrganization({
                                  ...selectedOrganization,
                                  ...body,
                                })
                              }
                            } else {
                              await createOrganization(apiConnection, body)
                              toast.success('등록되었습니다.')
                            }
                            queryClient.invalidateQueries({
                              queryKey: [
                                'organizations-by-country',
                                effectiveCountryId,
                              ],
                            })
                            setOrganizationModalOpen(false)
                            setEditingOrganization(null)
                          } catch (err) {
                            const msg =
                              err instanceof Error
                                ? err.message
                                : '저장에 실패했습니다.'
                            setOrganizationModalError(msg)
                            toast.error(msg)
                          } finally {
                            setOrganizationModalSubmitting(false)
                          }
                        }}
                      >
                        <OrgField>
                          <OrgLabel>
                            이름 <span style={{ color: '#ef4444' }}>*</span>
                          </OrgLabel>
                          <OrgInput
                            value={organizationForm.name}
                            onChange={(e) =>
                              setOrganizationForm((f) => ({
                                ...f,
                                name: e.target.value,
                              }))
                            }
                            placeholder="예: 남만주철도주식회사, 관동군"
                            autoFocus
                          />
                        </OrgField>
                        <OrgField>
                          <OrgLabel>약칭 / 두문자</OrgLabel>
                          <OrgInput
                            value={organizationForm.shortName ?? ''}
                            onChange={(e) =>
                              setOrganizationForm((f) => ({
                                ...f,
                                shortName: e.target.value || null,
                              }))
                            }
                            placeholder="예: 만철, MOFA"
                          />
                        </OrgField>
                        <OrgField>
                          <OrgLabel>로컬 명칭 (현지어)</OrgLabel>
                          <OrgInput
                            value={organizationForm.localName ?? ''}
                            onChange={(e) =>
                              setOrganizationForm((f) => ({
                                ...f,
                                localName: e.target.value || null,
                              }))
                            }
                            placeholder="예: 南滿洲鐵道株式會社"
                          />
                        </OrgField>
                        <OrgField>
                          <OrgLabel>유형</OrgLabel>
                          <OrgSelect
                            value={organizationForm.type}
                            onChange={(e) =>
                              setOrganizationForm((f) => ({
                                ...f,
                                type: e.target.value as OrganizationType,
                              }))
                            }
                          >
                            {ORGANIZATION_TYPE_OPTIONS.map((o) => (
                              <option key={o.value} value={o.value}>
                                {o.label}
                              </option>
                            ))}
                          </OrgSelect>
                        </OrgField>
                        <OrgField>
                          <OrgLabel>활동 범위</OrgLabel>
                          <OrgSelect
                            value={organizationForm.scope ?? ''}
                            onChange={(e) =>
                              setOrganizationForm((f) => ({
                                ...f,
                                scope: (e.target.value || null) as
                                  | import('@/shared/api/organizations').OrganizationScope
                                  | null,
                              }))
                            }
                          >
                            <option value="">선택 안 함</option>
                            {ORGANIZATION_SCOPE_OPTIONS.map((o) => (
                              <option key={o.value} value={o.value}>
                                {o.label}
                              </option>
                            ))}
                          </OrgSelect>
                        </OrgField>
                        <OrgField>
                          <OrgLabel>소속 국가 (현대)</OrgLabel>
                          <OrgSelect
                            value={organizationForm.countryId ?? ''}
                            onChange={(e) =>
                              setOrganizationForm((f) => ({
                                ...f,
                                countryId: e.target.value || null,
                                historicalCountryId: e.target.value
                                  ? null
                                  : f.historicalCountryId,
                              }))
                            }
                          >
                            <option value="">선택 안 함</option>
                            {countriesList.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.name}
                              </option>
                            ))}
                          </OrgSelect>
                        </OrgField>
                        <OrgField>
                          <OrgLabel>소속 국가 (역사적)</OrgLabel>
                          <OrgSelect
                            value={organizationForm.historicalCountryId ?? ''}
                            onChange={(e) =>
                              setOrganizationForm((f) => ({
                                ...f,
                                historicalCountryId: e.target.value || null,
                                countryId: e.target.value ? null : f.countryId,
                              }))
                            }
                          >
                            <option value="">선택 안 함</option>
                            {historicalCountriesList.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.name}
                              </option>
                            ))}
                          </OrgSelect>
                        </OrgField>
                        <OrgField>
                          <OrgLabel>설립일</OrgLabel>
                          <OrgInput
                            type="date"
                            value={organizationForm.foundedDate ?? ''}
                            onChange={(e) =>
                              setOrganizationForm((f) => ({
                                ...f,
                                foundedDate: e.target.value || null,
                              }))
                            }
                            style={{ maxWidth: 200 }}
                          />
                        </OrgField>
                        <OrgField>
                          <OrgLabel>해체일</OrgLabel>
                          <OrgInput
                            type="date"
                            value={organizationForm.dissolvedDate ?? ''}
                            onChange={(e) =>
                              setOrganizationForm((f) => ({
                                ...f,
                                dissolvedDate: e.target.value || null,
                              }))
                            }
                            style={{ maxWidth: 200 }}
                          />
                        </OrgField>
                        <OrgField>
                          <OrgLabel>공식 웹사이트</OrgLabel>
                          <OrgInput
                            type="url"
                            value={organizationForm.websiteUrl ?? ''}
                            onChange={(e) =>
                              setOrganizationForm((f) => ({
                                ...f,
                                websiteUrl: e.target.value || null,
                              }))
                            }
                            placeholder="https://..."
                          />
                        </OrgField>
                        <OrgField>
                          <OrgLabel>로고 URL</OrgLabel>
                          <OrgInput
                            type="url"
                            value={organizationForm.logoUrl ?? ''}
                            onChange={(e) =>
                              setOrganizationForm((f) => ({
                                ...f,
                                logoUrl: e.target.value || null,
                              }))
                            }
                            placeholder="이미지 URL"
                          />
                        </OrgField>
                        <OrgField>
                          <OrgLabel>설명 (역할·목적·개요)</OrgLabel>
                          <OrgTextArea
                            value={organizationForm.description ?? ''}
                            onChange={(e) =>
                              setOrganizationForm((f) => ({
                                ...f,
                                description: e.target.value || null,
                              }))
                            }
                            placeholder="이 조직이 하는 일, 설립 목적, 주요 활동 등"
                            rows={3}
                          />
                        </OrgField>
                        <OrgField style={{ marginBottom: 0 }}>
                          <OrgLabel>이념 / 노선 (정당·노조 등)</OrgLabel>
                          <OrgTextArea
                            value={organizationForm.ideology ?? ''}
                            onChange={(e) =>
                              setOrganizationForm((f) => ({
                                ...f,
                                ideology: e.target.value || null,
                              }))
                            }
                            placeholder="선택"
                            rows={2}
                          />
                        </OrgField>
                        {organizationModalError && (
                          <OrgErrorText>{organizationModalError}</OrgErrorText>
                        )}
                        <OrgFormActions>
                          <OrgCancelBtn
                            type="button"
                            onClick={() => {
                              setOrganizationModalOpen(false)
                              setOrganizationModalError(null)
                            }}
                          >
                            취소
                          </OrgCancelBtn>
                          <OrgPrimaryBtn
                            type="submit"
                            disabled={organizationModalSubmitting}
                          >
                            {organizationModalSubmitting
                              ? '저장 중…'
                              : editingOrganization
                                ? '저장'
                                : '등록'}
                          </OrgPrimaryBtn>
                        </OrgFormActions>
                      </form>
                    </ModalBody>
                  </OrgModalBoxCustom>
                </motion.div>
              </ModalOverlay>,
              document.body,
            )}

          {/* 직위 설정 모달 */}
          {orgModalTab === 'positions' &&
            selectedOrganization &&
            createPortal(
              <ModalOverlay
                role="dialog"
                aria-modal="true"
                aria-labelledby="org-position-modal-title"
                onClick={() => setOrgModalTab('info')}
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.2 }}
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    width: '90vw',
                    maxWidth: 700,
                    maxHeight: '90vh',
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                  <OrgModalBoxCustom
                    style={{
                      maxHeight: '90vh',
                      overflow: 'hidden',
                      display: 'flex',
                      flexDirection: 'column',
                    }}
                  >
                    <ModalHeader>
                      <ModalTitle id="org-position-modal-title">
                        <FiAward size={22} strokeWidth={2} />
                        직위 설정 — {selectedOrganization.name}
                      </ModalTitle>
                      <ModalCloseButton
                        type="button"
                        onClick={() => setOrgModalTab('info')}
                        aria-label="닫기"
                      >
                        <FiX size={22} strokeWidth={2} />
                      </ModalCloseButton>
                    </ModalHeader>
                    <ModalBody style={{ flex: 1, overflow: 'auto' }}>
                      <PositionDefinitionsSection
                        fixedOrganizationId={selectedOrganization.id}
                        fixedOrganizationName={
                          selectedOrganization.shortName
                            ? `${selectedOrganization.name} (${selectedOrganization.shortName})`
                            : selectedOrganization.name
                        }
                      />
                    </ModalBody>
                  </OrgModalBoxCustom>
                </motion.div>
              </ModalOverlay>,
              document.body,
            )}
        </section>
      )}

      {/* 부처 카테고리 모달 */}
      {categoryModalOpen && (
        <ModalOverlay
          role="dialog"
          aria-modal="true"
          aria-labelledby="category-modal-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeCategoryModal()
          }}
        >
          <CategoryBox
            id="category-modal-title"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.22, ease: [0.25, 0.46, 0.45, 0.94] }}
            onClick={(e) => e.stopPropagation()}
          >
            <ModalHeader>
              <div>
                <ModalTitle>
                  <FiGrid size={24} strokeWidth={2} />
                  부처 카테고리
                </ModalTitle>
                <ModalSubtitle>국방·외교 등 공통 분류 관리</ModalSubtitle>
              </div>
              <ModalCloseButton
                type="button"
                onClick={closeCategoryModal}
                aria-label="닫기"
              >
                <FiX size={22} strokeWidth={2} />
              </ModalCloseButton>
            </ModalHeader>

            <ModalBody>
              <CategoryFormBlock>
                <CategorySectionTitle>추가 / 수정</CategorySectionTitle>
                <CategoryFormLabel htmlFor="category-form-name">
                  카테고리명
                </CategoryFormLabel>
                <CategoryInput
                  id="category-form-name"
                  value={categoryForm.name}
                  onChange={(e) =>
                    setCategoryForm((f) => ({ ...f, name: e.target.value }))
                  }
                  placeholder="예: 국방"
                />
                <CategoryFormLabel htmlFor="category-form-nameEn">
                  영문명 (선택)
                </CategoryFormLabel>
                <CategoryInput
                  id="category-form-nameEn"
                  value={categoryForm.nameEn}
                  onChange={(e) =>
                    setCategoryForm((f) => ({ ...f, nameEn: e.target.value }))
                  }
                  placeholder="예: Defense"
                />
                <CategoryBtnRow>
                  <CategoryPrimaryBtn
                    type="button"
                    onClick={saveCategoryForm}
                    disabled={categoryFormSaving}
                  >
                    {categoryFormSaving
                      ? '저장 중…'
                      : editingCategoryId
                        ? '수정'
                        : '추가'}
                  </CategoryPrimaryBtn>
                  {editingCategoryId && (
                    <CategorySecondaryBtn
                      type="button"
                      onClick={() => {
                        setEditingCategoryId(null)
                        setCategoryForm({ name: '', nameEn: '' })
                      }}
                    >
                      취소
                    </CategorySecondaryBtn>
                  )}
                </CategoryBtnRow>
              </CategoryFormBlock>

              <CategoryListSectionTitle>
                등록된 카테고리
              </CategoryListSectionTitle>
              <CategoryList>
                {categoryModalList.length === 0 ? (
                  <CategoryEmptyMessage>
                    등록된 카테고리가 없습니다.
                  </CategoryEmptyMessage>
                ) : (
                  categoryModalList.map((cat) => (
                    <CategoryListItem key={cat.id}>
                      <CategoryListItemLabel>
                        {cat.name}
                        {cat.nameEn && <span>({cat.nameEn})</span>}
                      </CategoryListItemLabel>
                      <CategoryItemActions>
                        <CategoryEditBtn
                          type="button"
                          onClick={() => {
                            setEditingCategoryId(cat.id)
                            setCategoryForm({
                              name: cat.name,
                              nameEn: cat.nameEn ?? '',
                            })
                          }}
                        >
                          수정
                        </CategoryEditBtn>
                        <CategoryDeleteBtn
                          type="button"
                          onClick={() => deleteCategoryById(cat.id)}
                        >
                          삭제
                        </CategoryDeleteBtn>
                      </CategoryItemActions>
                    </CategoryListItem>
                  ))
                )}
              </CategoryList>
            </ModalBody>
          </CategoryBox>
        </ModalOverlay>
      )}

      <MilitaryUnitFormModal
        isOpen={militaryUnitModalOpen}
        onClose={() => {
          setMilitaryUnitModalOpen(false)
          setMilitaryUnitEditingId(null)
        }}
        onSaved={() => {
          loadMinistries()
        }}
        defaultCountryId={effectiveCountryId ?? null}
        defaultAdministrationDepartmentId={ministryBrowseResolved?.id ?? null}
        editingUnitId={militaryUnitEditingId}
        lockCountryAndDepartment={
          !militaryUnitEditingId &&
          Boolean(effectiveCountryId && ministryBrowseResolved?.id)
        }
      />
    </div>
  )
}

// 통계 카드 (카드별 액센트 색)
function StatCard({
  accentColor = MAIN,
  icon,
  title,
  value,
  unit,
}: {
  accentColor?: string
  icon: React.ReactNode
  title: string
  value: string | number
  unit: string
}) {
  const { mode } = useThemeStore()
  const isDark = mode === 'dark'
  return (
    <div
      style={{
        background: isDark ? 'rgba(255,255,255,0.04)' : '#ffffff',
        border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#e5e7eb'}`,
        borderRadius: 16,
        padding: 22,
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        transition:
          'transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease',
        position: 'relative',
        overflow: 'hidden',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)'
        e.currentTarget.style.boxShadow = isDark
          ? '0 8px 20px rgba(0,0,0,0.3)'
          : '0 8px 20px rgba(0,0,0,0.06)'
        e.currentTarget.style.borderColor = isDark
          ? 'rgba(255,255,255,0.15)'
          : '#d1d5db'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)'
        e.currentTarget.style.boxShadow = 'none'
        e.currentTarget.style.borderColor = isDark
          ? 'rgba(255,255,255,0.08)'
          : '#e5e7eb'
      }}
    >
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: 12,
          background: isDark ? 'rgba(255,255,255,0.07)' : '#f3f4f6',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: accentColor,
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
      <div style={{ minWidth: 0 }}>
        <div
          style={{
            fontSize: 11,
            color: isDark ? '#64748b' : '#6b7280',
            marginBottom: 4,
            fontWeight: 600,
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
          }}
        >
          {title}
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            gap: 6,
            flexWrap: 'wrap',
          }}
        >
          <span
            style={{
              fontSize: 24,
              fontWeight: 700,
              color: isDark ? '#f1f5f9' : '#111827',
              letterSpacing: '-0.03em',
              lineHeight: 1.2,
            }}
          >
            {value}
          </span>
          <span
            style={{
              fontSize: 13,
              fontWeight: 500,
              color: isDark ? '#64748b' : '#6b7280',
            }}
          >
            {unit}
          </span>
        </div>
      </div>
    </div>
  )
}

// 조직 타입 카드 (카드별 액센트 색)
function OrgTypeCard({
  accentColor = MAIN,
  title,
  count,
  description,
  examples,
}: {
  accentColor?: string
  title: string
  count: number
  description: string
  examples: string[]
}) {
  const { mode } = useThemeStore()
  const isDark = mode === 'dark'
  return (
    <div
      style={{
        background: isDark ? 'rgba(255,255,255,0.04)' : '#ffffff',
        border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#e5e7eb'}`,
        borderRadius: 16,
        padding: 22,
        transition:
          'transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)'
        e.currentTarget.style.boxShadow = isDark
          ? '0 8px 20px rgba(0,0,0,0.3)'
          : '0 8px 20px rgba(0,0,0,0.06)'
        e.currentTarget.style.borderColor = isDark
          ? 'rgba(255,255,255,0.15)'
          : '#d1d5db'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)'
        e.currentTarget.style.boxShadow = 'none'
        e.currentTarget.style.borderColor = isDark
          ? 'rgba(255,255,255,0.08)'
          : '#e5e7eb'
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 12,
        }}
      >
        <h4
          style={{
            fontSize: 15,
            fontWeight: 600,
            color: isDark ? '#f1f5f9' : '#111827',
            margin: 0,
            letterSpacing: '-0.02em',
          }}
        >
          {title}
        </h4>
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            background: accentColor,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            fontSize: 16,
            fontWeight: 700,
          }}
        >
          {count}
        </div>
      </div>
      <p
        style={{
          fontSize: 13,
          color: isDark ? '#64748b' : '#6b7280',
          marginBottom: 12,
          lineHeight: 1.45,
        }}
      >
        {description}
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {examples.map((example, idx) => (
          <div
            key={idx}
            style={{
              fontSize: 12,
              color: isDark ? '#94a3b8' : '#374151',
              padding: '8px 12px',
              background: isDark ? 'rgba(255,255,255,0.04)' : '#f9fafb',
              borderRadius: 8,
              border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#e5e7eb'}`,
            }}
          >
            • {example}
          </div>
        ))}
      </div>
    </div>
  )
}

// 이벤트 타입별 아이콘
function getEventIcon(type: string) {
  switch (type) {
    case 'establishment':
      return (
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#ffffff"
          strokeWidth="2"
        >
          <path d="M3 21h18M4 18h16M6 18V9m12 9V9M8 6l4-3 4 3M8 18V6h8v12" />
        </svg>
      )
    case 'reform':
      return (
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#ffffff"
          strokeWidth="2"
        >
          <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2" />
        </svg>
      )
    case 'achievement':
      return (
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#ffffff"
          strokeWidth="2"
        >
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      )
    case 'crisis':
      return (
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#ffffff"
          strokeWidth="2"
        >
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      )
    case 'merger':
      return (
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#ffffff"
          strokeWidth="2"
        >
          <path d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5" />
        </svg>
      )
    default:
      return (
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#ffffff"
          strokeWidth="2"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="16" x2="12" y2="12" />
          <line x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
      )
  }
}
