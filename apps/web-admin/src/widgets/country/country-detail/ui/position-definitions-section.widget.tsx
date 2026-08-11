/**
 * 관직/직위 정의 목록 및 등록/수정 섹션
 * - categoryId: 중앙부처 카테고리 페이지에서 고정 주입
 * - organizationId: 행정기구 페이지에서 고정 주입
 * - 둘 다 없으면 전체 목록 + 직접 선택
 */
import React, { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import styled from 'styled-components'
import {
  FiPlus,
  FiArrowLeft,
  FiEdit2,
  FiTrash2,
  FiChevronDown,
  FiLayers,
  FiAward,
  FiX,
} from 'react-icons/fi'
import { useCountries } from '@/features/country/api'
import { useHistoricalCountries } from '@/features/historical-country/use-historical-countries.hook'
import { CountrySearchModal } from '@/shared/ui/country-search-modal/country-search-modal'
import { personCareerApi } from '@/shared/api/person-career'
import type { CreateGovernmentPositionDefinitionDto } from '@/shared/api/person-career'
import { administrationDepartmentApi } from '@/shared/api/administration-department'
import { confirm } from '@/shared/ui/confirm-dialog'
import { notify } from '@/shared/ui/toast'
import { SelectModal, type SelectOption } from '@/shared/ui/select-modal/select-modal'
import type { GovernmentPositionDefinition } from '@/shared/api/government-positions'
import {
  FormCardWrapper,
  FormHeader,
  FormHeaderTitle,
  BackButton,
  SubmitButton,
  FormSectionInner,
  FormRows,
  FieldRow,
  FieldLabel,
  FieldControl,
  FieldHint,
  Required,
  Input,
} from '@/shared/ui/register-form-layout'

/* ─── 직위 유형 옵션 ─── */
const POSITION_TYPE_OPTIONS: SelectOption<string>[] = [
  { value: 'HEAD_OF_STATE', label: '국가 원수' },
  { value: 'HEAD_OF_GOVERNMENT', label: '정부 수반' },
  { value: 'DEPUTY_HEAD_OF_STATE', label: '부통령' },
  { value: 'HEIR_APPARENT', label: '왕세자·세자' },
  { value: 'REGENT', label: '섭정' },
  { value: 'CABINET_MINISTER', label: '각료/장관' },
  { value: 'VICE_MINISTER', label: '차관' },
  { value: 'LEGISLATOR', label: '의회의원' },
  { value: 'JUDICIARY', label: '사법부' },
  { value: 'LOCAL_GOVERNMENT', label: '지방정부' },
  { value: 'SPECIAL_POSITION', label: '특별직' },
  { value: 'DIPLOMATIC_POST', label: '외교직' },
  { value: 'MILITARY_COMMANDER', label: '군 지휘관' },
  { value: 'ROYAL_NOBLE_TITLE', label: '왕족/귀족' },
  { value: 'OTHER', label: '기타' },
]

const POSITION_TYPE_COLOR: Record<string, { bg: string; text: string; border: string }> = {
  HEAD_OF_STATE:      { bg: '#fef3c7', text: '#92400e', border: '#fde68a' },
  HEAD_OF_GOVERNMENT: { bg: '#dbeafe', text: '#1e40af', border: '#bfdbfe' },
  DEPUTY_HEAD_OF_STATE: { bg: '#fef3c7', text: '#92400e', border: '#fcd34d' },
  HEIR_APPARENT:      { bg: '#f3e8ff', text: '#6b21a8', border: '#e9d5ff' },
  REGENT:             { bg: '#fce7f3', text: '#9d174d', border: '#fbcfe8' },
  CABINET_MINISTER:   { bg: '#d1fae5', text: '#065f46', border: '#a7f3d0' },
  VICE_MINISTER:      { bg: '#ecfdf5', text: '#047857', border: '#6ee7b7' },
  LEGISLATOR:         { bg: '#e0f2fe', text: '#0369a1', border: '#bae6fd' },
  JUDICIARY:          { bg: '#fef9c3', text: '#713f12', border: '#fef08a' },
  LOCAL_GOVERNMENT:   { bg: '#f0fdf4', text: '#15803d', border: '#bbf7d0' },
  SPECIAL_POSITION:   { bg: '#f1f5f9', text: '#475569', border: '#e2e8f0' },
  DIPLOMATIC_POST:    { bg: '#e0e7ff', text: '#3730a3', border: '#c7d2fe' },
  MILITARY_COMMANDER: { bg: '#fff7ed', text: '#9a3412', border: '#fed7aa' },
  ROYAL_NOBLE_TITLE:  { bg: '#fdf4ff', text: '#86198f', border: '#f0abfc' },
  OTHER:              { bg: '#f8fafc', text: '#64748b', border: '#e2e8f0' },
}

export interface PositionDefinitionsSectionProps {
  /** 중앙부처 카테고리 페이지에서 고정 주입 — 이 카테고리 소속 직위만 표시·등록 */
  fixedCategoryId?: string
  fixedCategoryName?: string
  /** 행정기구 페이지에서 고정 주입 — 이 기구 소속 직위만 표시·등록 */
  fixedOrganizationId?: string
  fixedOrganizationName?: string
}

/* ─── 스타일 ─── */
const Section = styled.section`
  min-width: 0;
  max-width: 100%;
  box-sizing: border-box;
`

const SectionHead = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 24px;
  flex-wrap: wrap;
`

const SectionTitleBlock = styled.div``

const SectionTitle = styled.h2`
  margin: 0 0 5px;
  font-size: 18px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
  letter-spacing: -0.025em;
  display: flex;
  align-items: center;
  gap: 9px;
`

const SectionSub = styled.p`
  margin: 0;
  font-size: 13px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const AddBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 9px 16px;
  font-size: 13px;
  font-weight: 600;
  color: ${({ theme }) => theme.mode === 'dark' ? '#a5b4fc' : '#4f46e5'};
  background: ${({ theme }) => theme.mode === 'dark' ? 'rgba(99,102,241,0.15)' : '#eef2ff'};
  border: 1px solid ${({ theme }) => theme.mode === 'dark' ? 'rgba(99,102,241,0.35)' : '#c7d2fe'};
  border-radius: 10px;
  cursor: pointer;
  flex-shrink: 0;
  transition: background 0.15s, border-color 0.15s, box-shadow 0.15s;
  &:hover {
    background: ${({ theme }) => theme.mode === 'dark' ? 'rgba(99,102,241,0.25)' : '#e0e7ff'};
    border-color: ${({ theme }) => theme.mode === 'dark' ? 'rgba(99,102,241,0.55)' : '#a5b4fc'};
    box-shadow: 0 2px 8px rgba(79, 70, 229, 0.14);
  }
`

const List = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
`

const Card = styled.li`
  display: flex;
  align-items: flex-start;
  gap: 14px;
  padding: 16px 18px;
  background: ${({ theme }) => theme.mode === 'dark' ? 'rgba(255,255,255,0.04)' : '#fff'};
  border: 1px solid ${({ theme }) => theme.mode === 'dark' ? 'rgba(255,255,255,0.08)' : '#e9eef5'};
  border-radius: 14px;
  transition: border-color 0.15s, box-shadow 0.15s;
  &:hover {
    border-color: ${({ theme }) => theme.mode === 'dark' ? 'rgba(99,102,241,0.4)' : '#c7d2fe'};
    box-shadow: 0 2px 10px rgba(79, 70, 229, 0.07);
  }
`

const CardBody = styled.div`
  flex: 1;
  min-width: 0;
`

const CardTitle = styled.div`
  font-size: 15px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  margin-bottom: 7px;
`

const CardMeta = styled.div`
  display: flex;
  align-items: center;
  gap: 7px;
  flex-wrap: wrap;
`

const TypeBadge = styled.span<{ $type: string }>`
  display: inline-flex;
  align-items: center;
  padding: 2px 9px;
  border-radius: 999px;
  font-size: 11.5px;
  font-weight: 600;
  line-height: 1.6;
  background: ${(p) => POSITION_TYPE_COLOR[p.$type]?.bg ?? '#f1f5f9'};
  color: ${(p) => POSITION_TYPE_COLOR[p.$type]?.text ?? '#475569'};
  border: 1px solid ${(p) => POSITION_TYPE_COLOR[p.$type]?.border ?? '#e2e8f0'};
`

const Dot = styled.span`
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background: #cbd5e1;
  flex-shrink: 0;
`

const MetaText = styled.span`
  font-size: 12.5px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

/**
 * 적용 범위 칩 — "전역"인지 "특정 국가 전용"인지를 목록에서 바로 읽히게 한다.
 * 이 구분이 안 보이면 "왜 이 직책이 저 나라 피커에 안 뜨지?"를 추적할 방법이 없다.
 */
const ScopeChip = styled.span<{ $global: boolean }>`
  display: inline-flex;
  align-items: center;
  padding: 2px 9px;
  border-radius: 999px;
  font-size: 11.5px;
  font-weight: 600;
  line-height: 1.6;
  background: ${({ $global, theme }) =>
    $global
      ? theme.mode === 'dark'
        ? 'rgba(255,255,255,0.06)'
        : '#f1f5f9'
      : theme.mode === 'dark'
        ? 'rgba(99, 106, 242, 0.18)'
        : '#eef2ff'};
  color: ${({ $global, theme }) =>
    $global ? theme.colors.text.tertiary : theme.colors.primary};
  border: 1px solid
    ${({ $global, theme }) =>
      $global ? theme.colors.border.default : 'rgba(99, 102, 241, 0.35)'};
`

/** 폼의 적용 범위 편집 — 칩 + 제거 버튼 */
const ScopeEditRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
`

const ScopeEditChip = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 8px 5px 12px;
  border-radius: 999px;
  font-size: 12.5px;
  font-weight: 600;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(99, 106, 242, 0.18)' : '#eef2ff'};
  color: ${({ theme }) => theme.colors.primary};
  border: 1px solid rgba(99, 102, 241, 0.35);

  button {
    display: inline-flex;
    padding: 2px;
    border: none;
    background: transparent;
    color: inherit;
    cursor: pointer;
    border-radius: 50%;
  }
  button:hover {
    background: rgba(99, 102, 241, 0.18);
  }
`

const ScopeAddBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 999px;
  border: 1px dashed ${({ theme }) => theme.colors.border.medium};
  background: transparent;
  color: ${({ theme }) => theme.colors.text.secondary};
  font-family: inherit;
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;

  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
    color: ${({ theme }) => theme.colors.primary};
  }
`

const CardDesc = styled.p`
  margin: 8px 0 0;
  font-size: 13px;
  color: ${({ theme }) => theme.colors.text.secondary};
  line-height: 1.65;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
`

const CardActions = styled.div`
  display: flex;
  gap: 2px;
  flex-shrink: 0;
`

const IconBtn = styled.button<{ $danger?: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  padding: 0;
  background: transparent;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  color: ${({ theme }) => theme.colors.text.tertiary};
  transition: background 0.15s, color 0.15s;
  &:hover {
    background: ${(p) => p.$danger
      ? (p.theme.mode === 'dark' ? 'rgba(220,38,38,0.15)' : '#fee2e2')
      : (p.theme.mode === 'dark' ? 'rgba(255,255,255,0.08)' : '#f1f5f9')};
    color: ${(p) => p.$danger
      ? '#dc2626'
      : (p.theme.mode === 'dark' ? '#f1f5f9' : '#0f172a')};
  }
`

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 60px 24px;
  color: #94a3b8;
  font-size: 14px;
  text-align: center;
`

const FormWrap = styled.div`
  max-width: 800px;
`

const Textarea = styled.textarea`
  width: 100%;
  min-height: 110px;
  padding: 12px 16px;
  font-size: 14px;
  color: ${({ theme }) => theme.colors.text.primary};
  background: ${({ theme }) => theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : '#fff'};
  border: 1px solid ${({ theme }) => theme.mode === 'dark' ? 'rgba(255,255,255,0.12)' : '#e5e7eb'};
  border-radius: 12px;
  resize: vertical;
  line-height: 1.7;
  font-family: inherit;
  outline: none;
  transition: border-color 0.2s;
  box-sizing: border-box;
  &::placeholder { color: ${({ theme }) => theme.colors.text.tertiary}; }
  &:hover { border-color: ${({ theme }) => theme.mode === 'dark' ? 'rgba(255,255,255,0.2)' : '#d1d5db'}; }
  &:focus {
    border-color: ${({ theme }) => theme.mode === 'dark' ? 'rgba(99,102,241,0.6)' : '#4f46e5'};
    box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.08);
  }
`

const SelectTrigger = styled.button<{ $hasValue?: boolean }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
  max-width: 360px;
  border: 1px solid ${({ theme }) => theme.mode === 'dark' ? 'rgba(255,255,255,0.12)' : '#e5e7eb'};
  border-radius: 12px;
  padding: 12px 16px;
  background: ${({ theme }) => theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : '#fff'};
  color: ${(p) => p.$hasValue
    ? (p.theme.mode === 'dark' ? '#f1f5f9' : '#111827')
    : (p.theme.mode === 'dark' ? '#64748b' : '#9ca3af')};
  font-size: 14px;
  font-weight: 500;
  text-align: left;
  cursor: pointer;
  outline: none;
  transition: border-color 0.2s, box-shadow 0.2s, background 0.2s;
  span { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  svg { flex-shrink: 0; color: ${({ theme }) => theme.colors.text.tertiary}; }
  &:hover {
    background: ${({ theme }) => theme.mode === 'dark' ? 'rgba(255,255,255,0.08)' : '#fafafa'};
    border-color: ${({ theme }) => theme.mode === 'dark' ? 'rgba(255,255,255,0.2)' : '#d1d5db'};
  }
  &:focus {
    border-color: ${({ theme }) => theme.mode === 'dark' ? 'rgba(99,102,241,0.6)' : '#4f46e5'};
    box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.08);
    background: ${({ theme }) => theme.mode === 'dark' ? 'rgba(255,255,255,0.08)' : '#fff'};
  }
`

const CancelBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 18px;
  font-size: 13px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
  background: ${({ theme }) => theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : '#fff'};
  border: 1px solid ${({ theme }) => theme.mode === 'dark' ? 'rgba(255,255,255,0.12)' : '#e5e7eb'};
  border-radius: 12px;
  cursor: pointer;
  transition: border-color 0.2s, color 0.2s;
  &:hover { border-color: #6366f1; color: ${({ theme }) => theme.mode === 'dark' ? '#a5b4fc' : '#4f46e5'}; }
`

const FormActions = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 24px 32px;
  border-top: 1px solid ${({ theme }) => theme.mode === 'dark' ? 'rgba(255,255,255,0.08)' : '#f3f4f6'};
`

const emptyForm = (
  categoryId?: string | null,
  organizationId?: string | null,
): CreateGovernmentPositionDefinitionDto => ({
  title: '',
  titleEn: null,
  titleLocal: null,
  positionType: 'CABINET_MINISTER',
  description: null,
  rank: null,
  isMonarchical: false,
  categoryId: categoryId ?? null,
  organizationId: organizationId ?? null,
  establishedDate: null,
  abolishedDate: null,
})

/** 적용 범위를 사람이 읽는 국가 이름 목록으로 — 비어 있으면 그 정의는 전역이다. */
function describeScopes(def: GovernmentPositionDefinition): string[] {
  return (def.scopes ?? [])
    .map(
      (scope) =>
        scope.historicalCountry?.name ?? scope.country?.name ?? null,
    )
    .filter((name): name is string => !!name)
}

export function PositionDefinitionsSection({
  fixedCategoryId,
  fixedCategoryName,
  fixedOrganizationId,
  fixedOrganizationName,
}: PositionDefinitionsSectionProps) {
  const queryClient = useQueryClient()

  const [view, setView] = useState<'list' | 'form'>('list')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [positionTypeModalOpen, setPositionTypeModalOpen] = useState(false)
  const [categoryModalOpen, setCategoryModalOpen] = useState(false)
  const [scopeCountryModalOpen, setScopeCountryModalOpen] = useState(false)
  const [form, setForm] = useState<CreateGovernmentPositionDefinitionDto>(
    emptyForm(fixedCategoryId, fixedOrganizationId),
  )

  /* 전체 직위 목록 조회 — categoryId / organizationId 로 클라이언트 필터 */
  const { data: allDefinitions = [], isLoading } = useQuery({
    // ['position-definitions', …] 프리픽스 통일 — 정의를 만들면 재임·재위 피커도 함께 갱신된다
    queryKey: ['position-definitions', 'all'],
    queryFn: () => personCareerApi.getPositionDefinitions({}),
  })

  const definitions = (allDefinitions as GovernmentPositionDefinition[]).filter((d) => {
    if (fixedCategoryId) return d.categoryId === fixedCategoryId
    if (fixedOrganizationId) return d.organizationId === fixedOrganizationId
    return true
  })

  /* 카테고리 목록 (고정 카테고리가 없을 때 선택용) */
  const { data: categories = [] } = useQuery({
    queryKey: ['admin-dept-categories'],
    queryFn: () => administrationDepartmentApi.getCategories(),
    enabled: !fixedCategoryId && !fixedOrganizationId && view === 'form',
  })

  const refetch = () => {
    queryClient.invalidateQueries({ queryKey: ['position-definitions'] })
  }

  /* 적용 범위 편집 — 국가 목록은 앱 전역 캐시를 그대로 쓴다 */
  const { data: modernCountryList = [] } = useCountries()
  const { data: historicalCountryList = [] } = useHistoricalCountries()

  /** 수정 중인 정의의 현재 적용 범위 — 목록 캐시에서 파생해 추가·삭제 후 자동 갱신된다 */
  const editingScopes = editingId
    ? ((allDefinitions as GovernmentPositionDefinition[]).find(
        (def) => def.id === editingId,
      )?.scopes ?? [])
    : []

  const handleAddScope = async (target: { id: string; isHistorical: boolean }) => {
    if (!editingId || !target.id) return
    try {
      await personCareerApi.addPositionDefinitionScope(
        editingId,
        target.isHistorical
          ? { historicalCountryId: target.id }
          : { countryId: target.id },
      )
      notify.success('적용 범위가 추가되었습니다.')
      refetch()
    } catch (err) {
      notify.error(
        err instanceof Error ? err.message : '적용 범위 추가에 실패했습니다.',
      )
    }
  }

  const handleRemoveScope = async (scopeId: string) => {
    try {
      await personCareerApi.removePositionDefinitionScope(scopeId)
      notify.success('적용 범위가 해제되었습니다.')
      refetch()
    } catch (err) {
      notify.error(
        err instanceof Error ? err.message : '적용 범위 해제에 실패했습니다.',
      )
    }
  }

  const openForm = (def?: GovernmentPositionDefinition | null) => {
    if (def) {
      setEditingId(def.id)
      setForm({
        title: def.title,
        titleEn: def.titleEn ?? null,
        titleLocal: def.titleLocal ?? null,
        positionType: def.positionType,
        description: def.description ?? null,
        rank: def.rank ?? null,
        isMonarchical: def.isMonarchical ?? false,
        categoryId: def.categoryId ?? fixedCategoryId ?? null,
        organizationId: def.organizationId ?? fixedOrganizationId ?? null,
        establishedDate: def.establishedDate ?? null,
        abolishedDate: def.abolishedDate ?? null,
      })
    } else {
      setEditingId(null)
      setForm(emptyForm(fixedCategoryId, fixedOrganizationId))
    }
    setView('form')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title.trim()) {
      notify.error('직위명을 입력해주세요.')
      return
    }
    try {
      if (editingId) {
        await personCareerApi.updatePositionDefinition(editingId, form)
        notify.success('수정되었습니다.')
      } else {
        await personCareerApi.createPositionDefinition(form)
        notify.success('등록되었습니다.')
      }
      refetch()
      setView('list')
    } catch (err: any) {
      notify.error(err?.message || '저장에 실패했습니다.')
    }
  }

  const handleDelete = async (id: string, title: string) => {
    if (
      !(await confirm({
        title: '삭제 확인',
        message: `"${title}" 직위 정의를 삭제하시겠습니까?`,
        danger: true,
      }))
    )
      return
    try {
      await personCareerApi.deletePositionDefinition(id)
      notify.success('삭제되었습니다.')
      refetch()
    } catch (err: any) {
      notify.error(err?.message || '삭제에 실패했습니다.')
    }
  }

  const positionTypeLabel =
    POSITION_TYPE_OPTIONS.find((o) => o.value === form.positionType)?.label ?? form.positionType
  const selectedCategory = categories.find((c) => c.id === form.categoryId)

  const contextLabel = fixedCategoryName
    ? `"${fixedCategoryName}" 카테고리`
    : fixedOrganizationName
      ? `"${fixedOrganizationName}"`
      : '전체'

  return (
    <Section>
      <SectionHead>
        <SectionTitleBlock>
          <SectionTitle>
            <FiLayers size={18} color="#6366f1" />
            직위 정의
          </SectionTitle>
          {/* 이 목록은 국가로 걸러지지 않는다 — 전역 카탈로그 전체다.
              "이 국가 소속"이라고 적으면 거짓이 되므로 적용 범위 칩으로 구분을 넘긴다. */}
          <SectionSub>
            {contextLabel} 직위 목록입니다. 각 직위의 <strong>적용 범위</strong>가 비어 있으면
            모든 국가에서, 국가가 지정돼 있으면 그 국가에서만 재임·재위 등록에 나옵니다.
          </SectionSub>
        </SectionTitleBlock>
        {view === 'list' && (
          <AddBtn type="button" onClick={() => openForm(null)}>
            <FiPlus size={14} />
            직위 등록
          </AddBtn>
        )}
      </SectionHead>

      {view === 'list' ? (
        <>
          {isLoading ? (
            <EmptyState><FiLayers size={28} />불러오는 중...</EmptyState>
          ) : definitions.length === 0 ? (
            <EmptyState>
              <FiAward size={32} color="#c7d2fe" />
              등록된 직위가 없습니다.
            </EmptyState>
          ) : (
            <List>
              {definitions.map((def) => {
                const typeLabel =
                  POSITION_TYPE_OPTIONS.find((o) => o.value === def.positionType)?.label ??
                  def.positionType
                const parentLabel = def.category?.name ?? def.organization?.name ?? null
                const scopeLabels = describeScopes(def)

                return (
                  <Card key={def.id}>
                    <CardBody>
                      <CardTitle>{def.title}</CardTitle>
                      <CardMeta>
                        <TypeBadge $type={def.positionType}>{typeLabel}</TypeBadge>
                        {parentLabel && (
                          <>
                            <Dot />
                            <MetaText>{parentLabel}</MetaText>
                          </>
                        )}
                        {def.titleEn && (
                          <>
                            <Dot />
                            <MetaText>{def.titleEn}</MetaText>
                          </>
                        )}
                        <Dot />
                        <ScopeChip $global={scopeLabels.length === 0}>
                          {scopeLabels.length === 0
                            ? '전역'
                            : `${scopeLabels.slice(0, 3).join(' · ')}${
                                scopeLabels.length > 3 ? ` +${scopeLabels.length - 3}` : ''
                              } 전용`}
                        </ScopeChip>
                      </CardMeta>
                      {def.description && <CardDesc>{def.description}</CardDesc>}
                    </CardBody>
                    <CardActions>
                      <IconBtn type="button" onClick={() => openForm(def)} title="수정">
                        <FiEdit2 size={15} />
                      </IconBtn>
                      <IconBtn $danger type="button" onClick={() => handleDelete(def.id, def.title)} title="삭제">
                        <FiTrash2 size={15} />
                      </IconBtn>
                    </CardActions>
                  </Card>
                )
              })}
            </List>
          )}
        </>
      ) : (
        <FormWrap>
          <FormCardWrapper>
            <FormHeader>
              <BackButton type="button" onClick={() => setView('list')}>
                <FiArrowLeft size={16} />
                목록으로
              </BackButton>
              <FormHeaderTitle>
                {editingId ? '직위 정의 수정' : '직위 정의 등록'}
              </FormHeaderTitle>
            </FormHeader>

            <form onSubmit={handleSubmit}>
              <FormSectionInner>
                <FormRows>
                  <FieldRow>
                    <FieldLabel>직위명 <Required>필수</Required></FieldLabel>
                    <FieldControl>
                      <Input
                        value={form.title}
                        onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                        placeholder="예: 영의정, 외교부 장관, 조선총독"
                      />
                    </FieldControl>
                  </FieldRow>

                  <FieldRow>
                    <FieldLabel>영문 직위명</FieldLabel>
                    <FieldControl>
                      <Input
                        value={form.titleEn ?? ''}
                        onChange={(e) => setForm((f) => ({ ...f, titleEn: e.target.value || null }))}
                        placeholder="예: Prime Minister"
                      />
                    </FieldControl>
                  </FieldRow>

                  <FieldRow>
                    <FieldLabel>현지 직위명</FieldLabel>
                    <FieldControl>
                      <Input
                        value={form.titleLocal ?? ''}
                        onChange={(e) => setForm((f) => ({ ...f, titleLocal: e.target.value || null }))}
                        placeholder="예: 総理大臣"
                      />
                    </FieldControl>
                  </FieldRow>

                  <FieldRow>
                    <FieldLabel>직위 유형</FieldLabel>
                    <FieldControl>
                      <SelectTrigger
                        type="button"
                        $hasValue={!!form.positionType}
                        onClick={() => setPositionTypeModalOpen(true)}
                      >
                        <span>{positionTypeLabel}</span>
                        <FiChevronDown size={16} />
                      </SelectTrigger>
                      <SelectModal
                        isOpen={positionTypeModalOpen}
                        onClose={() => setPositionTypeModalOpen(false)}
                        options={POSITION_TYPE_OPTIONS}
                        selectedValue={form.positionType}
                        onSelect={(value) => {
                          setForm((f) => ({ ...f, positionType: value }))
                          setPositionTypeModalOpen(false)
                        }}
                        title="직위 유형 선택"
                      />
                    </FieldControl>
                  </FieldRow>

                  <FieldRow>
                    <FieldLabel>군주·주권 칭호</FieldLabel>
                    <FieldControl>
                      <label
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          cursor: 'pointer',
                          fontSize: 13,
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={form.isMonarchical ?? false}
                          onChange={(event) =>
                            setForm((prev) => ({
                              ...prev,
                              isMonarchical: event.target.checked,
                            }))
                          }
                        />
                        <span>
                          국왕·황제·번주 등 세습·주권 칭호 (체크 시 &ldquo;관직 재임&rdquo;
                          목록에서 숨기고 군주 재위로 등록)
                        </span>
                      </label>
                    </FieldControl>
                  </FieldRow>

                  {/* 적용 범위 — 수정 모드에서만. 신규 생성 시엔 아직 정의 id가 없어 스코프를 붙일 수 없다
                      (등록 후 다시 열어 지정). 비어 있으면 전역이라는 규칙을 문구로 명시한다. */}
                  {editingId && (
                    <FieldRow>
                      <FieldLabel>적용 범위</FieldLabel>
                      <FieldControl>
                        <ScopeEditRow>
                          {editingScopes.length === 0 ? (
                            <ScopeChip $global>전역 (모든 국가)</ScopeChip>
                          ) : (
                            editingScopes.map((scope) => (
                              <ScopeEditChip key={scope.id}>
                                {scope.historicalCountry?.name ??
                                  scope.country?.name ??
                                  '알 수 없음'}
                                <button
                                  type="button"
                                  aria-label="적용 범위 제거"
                                  onClick={() => handleRemoveScope(scope.id)}
                                >
                                  <FiX size={13} />
                                </button>
                              </ScopeEditChip>
                            ))
                          )}
                          <ScopeAddBtn
                            type="button"
                            onClick={() => setScopeCountryModalOpen(true)}
                          >
                            <FiPlus size={13} />
                            국가 지정
                          </ScopeAddBtn>
                        </ScopeEditRow>
                        <FieldHint style={{ marginTop: 8 }}>
                          비워 두면 <strong>모든 국가</strong>의 직책 목록에 나옵니다(총리·대통령
                          같은 보편 칭호). 국가를 지정하면 <strong>그 국가에서만</strong> 보입니다
                          (쇼군·영의정처럼 한 정체 고유 직책).
                        </FieldHint>
                      </FieldControl>
                    </FieldRow>
                  )}

                  {/* 카테고리 선택 — 고정 카테고리가 없을 때만 표시 */}
                  {!fixedCategoryId && !fixedOrganizationId && (
                    <FieldRow>
                      <FieldLabel>부처 카테고리</FieldLabel>
                      <FieldControl>
                        <SelectTrigger
                          type="button"
                          $hasValue={!!selectedCategory}
                          onClick={() => setCategoryModalOpen(true)}
                        >
                          <span>
                            {selectedCategory
                              ? selectedCategory.nameEn
                                ? `${selectedCategory.name} (${selectedCategory.nameEn})`
                                : selectedCategory.name
                              : '선택 안 함'}
                          </span>
                          <FiChevronDown size={16} />
                        </SelectTrigger>
                        <SelectModal
                          isOpen={categoryModalOpen}
                          onClose={() => setCategoryModalOpen(false)}
                          options={[
                            { value: '', label: '선택 안 함' },
                            ...categories.map((c) => ({
                              value: c.id,
                              label: c.nameEn ? `${c.name} (${c.nameEn})` : c.name,
                            })),
                          ]}
                          selectedValue={form.categoryId ?? ''}
                          onSelect={(value) => {
                            setForm((f) => ({ ...f, categoryId: value || null }))
                            setCategoryModalOpen(false)
                          }}
                          title="부처 카테고리 선택"
                        />
                        <FieldHint>외교부 장관 → 외교 카테고리, 국방부 장관 → 국방 카테고리</FieldHint>
                      </FieldControl>
                    </FieldRow>
                  )}

                  {/* 고정된 컨텍스트 표시 */}
                  {(fixedCategoryId || fixedOrganizationId) && (
                    <FieldRow>
                      <FieldLabel>{fixedCategoryId ? '부처 카테고리' : '소속 기구'}</FieldLabel>
                      <FieldControl>
                        <Input
                          value={fixedCategoryName ?? fixedOrganizationName ?? ''}
                          disabled
                          style={{ background: '#f8fafc', color: '#64748b' }}
                        />
                      </FieldControl>
                    </FieldRow>
                  )}

                  <FieldRow>
                    <FieldLabel>설명</FieldLabel>
                    <FieldControl>
                      <Textarea
                        value={form.description ?? ''}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, description: e.target.value || null }))
                        }
                        placeholder="직위의 역할, 권한, 역사적 배경 등을 자유롭게 기술하세요."
                        rows={5}
                      />
                    </FieldControl>
                  </FieldRow>
                </FormRows>
              </FormSectionInner>

              <FormActions>
                <SubmitButton type="submit">
                  {editingId ? '수정 완료' : '등록'}
                </SubmitButton>
                <CancelBtn type="button" onClick={() => setView('list')}>
                  취소
                </CancelBtn>
              </FormActions>
            </form>
          </FormCardWrapper>
        </FormWrap>
      )}

      {/* 적용 범위 지정 — 현대 국가·역사적 국가 어느 쪽이든 고를 수 있다.
          역사국가만 지정하면 사용자가 현대 국가만 골랐을 때 그 직책이 사라지므로,
          시드와 마찬가지로 대응 현대 국가도 함께 지정하는 편이 안전하다(dual-fill). */}
      <CountrySearchModal
        isOpen={scopeCountryModalOpen}
        onClose={() => setScopeCountryModalOpen(false)}
        title="적용 범위 국가 선택"
        placeholder="국가명으로 검색..."
        modernCountries={(modernCountryList as Array<{ id: string; name?: string | null; localName?: string | null; flagEmoji?: string | null }>).map(
          (country) => ({
            id: country.id,
            name: country.name ?? country.localName ?? country.id,
            flagEmoji: country.flagEmoji ?? null,
          }),
        )}
        historicalCountries={(historicalCountryList as Array<{ id: string; name?: string | null }>).map(
          (historical) => ({
            id: historical.id,
            name: historical.name ?? historical.id,
          }),
        )}
        onSelect={(selected) => {
          setScopeCountryModalOpen(false)
          void handleAddScope({ id: selected.id, isHistorical: selected.isHistorical })
        }}
      />
    </Section>
  )
}
