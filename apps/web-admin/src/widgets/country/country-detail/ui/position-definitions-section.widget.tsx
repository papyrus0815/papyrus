/**
 * 관직 정의 목록 및 등록/수정 섹션
 * 국가 상세에서 해당 국가의 관직 정의를 보고, 소속 조직을 선택해 등록·수정할 수 있음
 */
import React, { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import styled from 'styled-components'
import {
  FiPlus,
  FiArrowLeft,
  FiEdit2,
  FiTrash2,
  FiBriefcase,
  FiChevronDown,
} from 'react-icons/fi'
import { toast } from 'react-hot-toast'

import type { UnifiedCountry } from '@/entities/country/model/unified-types'
import { personCareerApi } from '@/shared/api/person-career'
import type { CreateGovernmentPositionDefinitionDto } from '@/shared/api/person-career'
import { getOrganizations } from '@/shared/api/organizations'
import { apiConnection } from '@/shared/api/client'
import { SelectModal, type SelectOption } from '@/shared/ui/select-modal'
import type { GovernmentPositionDefinition } from '@/shared/api/government-positions'

const POSITION_TYPE_OPTIONS: SelectOption<string>[] = [
  { value: 'HEAD_OF_STATE', label: '국가 원수' },
  { value: 'HEAD_OF_GOVERNMENT', label: '정부 수반' },
  { value: 'HEIR_APPARENT', label: '왕세자·세자' },
  { value: 'REGENT', label: '섭정' },
  { value: 'CABINET_MINISTER', label: '각료/장관' },
  { value: 'VICE_MINISTER', label: '차관' },
  { value: 'LEGISLATOR', label: '의회의원' },
  { value: 'JUDICIARY', label: '사법부' },
  { value: 'LOCAL_GOVERNMENT', label: '지방정부' },
  { value: 'SPECIAL_POSITION', label: '특별직' },
  { value: 'MILITARY_COMMANDER', label: '군 지휘관' },
  { value: 'ROYAL_NOBLE_TITLE', label: '왕족/귀족' },
  { value: 'OTHER', label: '기타' },
]

interface PositionDefinitionsSectionProps {
  country: UnifiedCountry
}

const Section = styled.section`
  margin-top: 48px;
  padding-top: 32px;
  border-top: 1px solid #eee;
`
const SectionHeader = styled.div`
  margin-bottom: 24px;
`
const SectionTitle = styled.h2`
  margin: 0 0 8px;
  font-size: 22px;
  font-weight: 600;
  color: #111;
`
const SectionSubtitle = styled.p`
  margin: 0;
  font-size: 14px;
  color: #666;
`
const ListWrap = styled.div``
const ListHead = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
`
const ListTitle = styled.h3`
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #333;
  .count {
    font-weight: 400;
    color: #888;
    margin-left: 8px;
  }
`
const AddButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  font-size: 14px;
  font-weight: 600;
  color: #fff;
  background: var(--color-primary);
  border: none;
  border-radius: 8px;
  cursor: pointer;
  &:hover {
    opacity: 0.9;
  }
`
const List = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
`
const ListItem = styled.li`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  background: #f9f9f9;
  border-radius: 10px;
  border: 1px solid #eee;
`
const ListItemMain = styled.div`
  .title {
    font-weight: 600;
    font-size: 16px;
    color: #111;
  }
  .meta {
    font-size: 13px;
    color: #666;
    margin-top: 4px;
  }
`
const ListItemActions = styled.div`
  display: flex;
  gap: 8px;
`
const IconButton = styled.button`
  padding: 8px;
  background: transparent;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  color: #666;
  &:hover {
    background: #eee;
    color: #111;
  }
`
const EmptyState = styled.div`
  text-align: center;
  padding: 48px 24px;
  color: #888;
  font-size: 15px;
`
const FormWrap = styled.div`
  max-width: 640px;
`
const BackButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 0 0 20px;
  font-size: 15px;
  color: #666;
  background: none;
  border: none;
  cursor: pointer;
  &:hover {
    color: #111;
  }
`
const FormTitle = styled.h2`
  margin: 0 0 8px;
  font-size: 22px;
  font-weight: 600;
  color: #111;
`
const FormDesc = styled.p`
  margin: 0 0 24px;
  font-size: 14px;
  color: #666;
`
const Field = styled.div`
  margin-bottom: 20px;
`
const Label = styled.label`
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: #333;
  margin-bottom: 6px;
`
const Input = styled.input`
  width: 100%;
  padding: 12px 14px;
  font-size: 15px;
  border: 1px solid #ddd;
  border-radius: 8px;
  &:focus {
    outline: none;
    border-color: var(--color-primary);
  }
`
const SelectBtn = styled.button<{ $hasValue?: boolean }>`
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
  font-size: 15px;
  color: ${(p) => (p.$hasValue ? '#111' : '#999')};
  background: #fff;
  border: 1px solid #ddd;
  border-radius: 8px;
  cursor: pointer;
  text-align: left;
  &:hover {
    border-color: var(--color-primary);
  }
`
const FormActions = styled.div`
  display: flex;
  gap: 12px;
  margin-top: 24px;
`
const SubmitBtn = styled.button`
  padding: 12px 24px;
  font-size: 15px;
  font-weight: 600;
  color: #fff;
  background: var(--color-primary);
  border: none;
  border-radius: 8px;
  cursor: pointer;
  &:hover:not(:disabled) {
    opacity: 0.9;
  }
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`
const CancelBtn = styled.button`
  padding: 12px 24px;
  font-size: 15px;
  font-weight: 500;
  color: #666;
  background: #fff;
  border: 1px solid #ddd;
  border-radius: 8px;
  cursor: pointer;
  &:hover {
    border-color: var(--color-primary);
    color: var(--color-primary);
  }
`

export function PositionDefinitionsSection({ country }: PositionDefinitionsSectionProps) {
  const queryClient = useQueryClient()
  const isHistorical = country.type === 'historical'
  const countryId = !isHistorical ? country.id : undefined
  const historicalCountryId = isHistorical ? country.id : undefined

  const [view, setView] = useState<'list' | 'form'>('list')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [positionTypeModalOpen, setPositionTypeModalOpen] = useState(false)
  const [organizationModalOpen, setOrganizationModalOpen] = useState(false)
  const [form, setForm] = useState<CreateGovernmentPositionDefinitionDto>({
    title: '',
    titleEn: null,
    titleLocal: null,
    positionType: 'CABINET_MINISTER',
    description: null,
    rank: null,
    departmentName: null,
    organizationId: null,
    countryId: countryId ?? null,
    historicalCountryId: historicalCountryId ?? null,
    establishedDate: null,
    abolishedDate: null,
  })

  const { data: definitions = [], isLoading } = useQuery({
    queryKey: ['position-definitions', countryId, historicalCountryId],
    queryFn: () =>
      personCareerApi.getPositionDefinitions({
        countryId,
        historicalCountryId,
      }),
    enabled: !!countryId || !!historicalCountryId,
  })

  const { data: organizations = [] } = useQuery({
    queryKey: [
      'organizations-for-definition',
      countryId,
      historicalCountryId,
    ],
    queryFn: () =>
      getOrganizations(apiConnection, {
        countryId: countryId ?? undefined,
        historicalCountryId: historicalCountryId ?? undefined,
        type: 'GOVERNMENT_AGENCY',
      }),
    enabled: (!!countryId || !!historicalCountryId) && (view === 'form'),
  })

  const refetch = () => {
    queryClient.invalidateQueries({
      queryKey: ['position-definitions', countryId, historicalCountryId],
    })
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
        departmentName: def.departmentName ?? null,
        organizationId: def.organizationId ?? null,
        countryId: def.countryId ?? countryId ?? null,
        historicalCountryId: def.historicalCountryId ?? historicalCountryId ?? null,
        establishedDate: def.establishedDate ?? null,
        abolishedDate: def.abolishedDate ?? null,
      })
    } else {
      setEditingId(null)
      setForm({
        title: '',
        titleEn: null,
        titleLocal: null,
        positionType: 'CABINET_MINISTER',
        description: null,
        rank: null,
        departmentName: null,
        organizationId: null,
        countryId: countryId ?? null,
        historicalCountryId: historicalCountryId ?? null,
        establishedDate: null,
        abolishedDate: null,
      })
    }
    setView('form')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title.trim()) {
      toast.error('직위명을 입력해주세요.')
      return
    }
    try {
      if (editingId) {
        await personCareerApi.updatePositionDefinition(editingId, form)
        toast.success('관직 정의가 수정되었습니다.')
      } else {
        await personCareerApi.createPositionDefinition(form)
        toast.success('관직 정의가 등록되었습니다.')
      }
      refetch()
      setView('list')
    } catch (err: any) {
      toast.error(err?.message || '저장에 실패했습니다.')
    }
  }

  const handleDelete = async (id: string, title: string) => {
    if (!window.confirm(`"${title}" 관직 정의를 삭제하시겠습니까?`)) return
    try {
      await personCareerApi.deletePositionDefinition(id)
      toast.success('삭제되었습니다.')
      refetch()
    } catch (err: any) {
      toast.error(err?.message || '삭제에 실패했습니다.')
    }
  }

  const positionTypeLabel =
    POSITION_TYPE_OPTIONS.find((o) => o.value === form.positionType)?.label ??
    form.positionType
  const selectedOrg = organizations.find((o) => o.id === form.organizationId)

  return (
    <Section>
      <SectionHeader>
        <SectionTitle>관직 정의</SectionTitle>
        <SectionSubtitle>
          이 국가의 관직(직위)를 정의합니다. 소속 행정기구를 선택해 연결할 수 있습니다.
        </SectionSubtitle>
      </SectionHeader>

      {view === 'list' ? (
        <ListWrap>
          <ListHead>
            <ListTitle>
              직위 목록
              {!isLoading && definitions.length > 0 && (
                <span className="count">{definitions.length}건</span>
              )}
            </ListTitle>
            <AddButton type="button" onClick={() => openForm(null)}>
              <FiPlus size={18} />
              관직 정의 등록
            </AddButton>
          </ListHead>
          {isLoading ? (
            <EmptyState>로딩 중...</EmptyState>
          ) : definitions.length === 0 ? (
            <EmptyState>
              등록된 관직 정의가 없습니다. 관직 정의 등록 버튼으로 추가해 보세요.
            </EmptyState>
          ) : (
            <List>
              {(definitions as GovernmentPositionDefinition[]).map((def) => (
                <ListItem key={def.id}>
                  <ListItemMain>
                    <div className="title">{def.title}</div>
                    <div className="meta">
                      {POSITION_TYPE_OPTIONS.find((o) => o.value === def.positionType)
                        ?.label ?? def.positionType}
                      {def.organization?.name && ` · ${def.organization.name}`}
                      {def.departmentName && !def.organization && ` · ${def.departmentName}`}
                    </div>
                  </ListItemMain>
                  <ListItemActions>
                    <IconButton
                      type="button"
                      onClick={() => openForm(def)}
                      title="수정"
                    >
                      <FiEdit2 size={18} />
                    </IconButton>
                    <IconButton
                      type="button"
                      onClick={() => handleDelete(def.id, def.title)}
                      title="삭제"
                    >
                      <FiTrash2 size={18} />
                    </IconButton>
                  </ListItemActions>
                </ListItem>
              ))}
            </List>
          )}
        </ListWrap>
      ) : (
        <FormWrap>
          <BackButton type="button" onClick={() => setView('list')}>
            <FiArrowLeft size={18} />
            목록 보기
          </BackButton>
          <FormTitle>
            {editingId ? '관직 정의 수정' : '관직 정의 등록'}
          </FormTitle>
          <FormDesc>
            직위명과 유형, 소속 조직(행정기구)을 입력하세요. 소속 조직은 같은 국가의
            행정기구 목록에서 선택합니다.
          </FormDesc>
          <form onSubmit={handleSubmit}>
            <Field>
              <Label>직위명 *</Label>
              <Input
                value={form.title}
                onChange={(e) =>
                  setForm((f) => ({ ...f, title: e.target.value }))
                }
                placeholder="예: 영의정, 외교부 장관"
              />
            </Field>
            <Field>
              <Label>직위 유형</Label>
              <SelectBtn
                type="button"
                $hasValue={!!form.positionType}
                onClick={() => setPositionTypeModalOpen(true)}
              >
                <span>{positionTypeLabel}</span>
                <FiChevronDown size={18} />
              </SelectBtn>
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
            </Field>
            <Field>
              <Label>소속 조직 (행정기구)</Label>
              <SelectBtn
                type="button"
                $hasValue={!!selectedOrg}
                onClick={() => setOrganizationModalOpen(true)}
              >
                <span>
                  {selectedOrg
                    ? selectedOrg.shortName
                      ? `${selectedOrg.name} (${selectedOrg.shortName})`
                      : selectedOrg.name
                    : '선택 안 함'}
                </span>
                <FiChevronDown size={18} />
              </SelectBtn>
              <SelectModal
                isOpen={organizationModalOpen}
                onClose={() => setOrganizationModalOpen(false)}
                options={[
                  { value: '', label: '선택 안 함' },
                  ...organizations.map((o) => ({
                    value: o.id,
                    label: o.shortName
                      ? `${o.name} (${o.shortName})`
                      : o.name,
                  })),
                ]}
                selectedValue={form.organizationId ?? ''}
                onSelect={(value) => {
                  setForm((f) => ({
                    ...f,
                    organizationId: value || null,
                  }))
                  setOrganizationModalOpen(false)
                }}
                title="소속 조직 선택"
              />
            </Field>
            <Field>
              <Label>부서/부처명 (표시용, 조직 미선택 시)</Label>
              <Input
                value={form.departmentName ?? ''}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    departmentName: e.target.value || null,
                  }))
                }
                placeholder="예: 이조, 외교부"
              />
            </Field>
            <Field>
              <Label>설명</Label>
              <Input
                value={form.description ?? ''}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    description: e.target.value || null,
                  }))
                }
                placeholder="직위 설명 (선택)"
              />
            </Field>
            <FormActions>
              <SubmitBtn type="submit">
                {editingId ? '수정' : '등록'}
              </SubmitBtn>
              <CancelBtn type="button" onClick={() => setView('list')}>
                취소
              </CancelBtn>
            </FormActions>
          </form>
        </FormWrap>
      )}
    </Section>
  )
}
