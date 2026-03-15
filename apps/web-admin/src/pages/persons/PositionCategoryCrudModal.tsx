/**
 * 관직 정의 CRUD 모달 (단일 레벨: 직함 + 직위 유형 enum)
 * 연대표 통계·최근 인물 톱니바퀴에서 열며, 직함을 직위 유형(enum)별로 그룹해 관리
 */
import React, { useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import styled from 'styled-components'
import {
  FiPlus,
  FiArrowLeft,
  FiEdit2,
  FiTrash2,
  FiChevronDown,
  FiX,
} from 'react-icons/fi'
import { createPortal } from 'react-dom'
import { toast } from 'react-hot-toast'

import { personCareerApi } from '@/shared/api/person-career'
import type {
  CreateGovernmentPositionDefinitionDto,
  UpdateGovernmentPositionDefinitionDto,
} from '@/shared/api/person-career'
import { administrationDepartmentApi } from '@/shared/api/administration-department'
import { SelectModal, type SelectOption } from '@/shared/ui/select-modal'
import type { GovernmentPositionDefinition } from '@/shared/api/government-positions'
import { Z_INDEX } from '@/shared/styles/z-index'

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

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  z-index: ${Z_INDEX.MODAL_OVERLAY};
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
`
const ModalCard = styled.div`
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
  max-width: 720px;
  width: 100%;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  z-index: ${Z_INDEX.MODAL_CONTENT};
  position: relative;
`
const ModalHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid #eee;
`
const ModalTitle = styled.h2`
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: #111;
`
const CloseBtn = styled.button`
  padding: 8px;
  background: none;
  border: none;
  border-radius: 8px;
  color: #666;
  cursor: pointer;
  &:hover {
    background: #eee;
    color: #111;
  }
`
const ModalBody = styled.div`
  padding: 24px;
  overflow-y: auto;
  flex: 1;
`
const ListHead = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
`
const ListTitle = styled.h3`
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #333;
`
const AddButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
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
const GroupSection = styled.div`
  margin-bottom: 20px;
`
const GroupTitle = styled.div`
  font-size: 13px;
  font-weight: 600;
  color: var(--color-primary);
  margin-bottom: 8px;
  padding-bottom: 4px;
  border-bottom: 1px solid #eee;
`
const Row = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  background: #fafafa;
  border-radius: 6px;
  margin-bottom: 4px;
  border: 1px solid #eee;
`
const RowTitle = styled.div`
  font-weight: 600;
  font-size: 15px;
  color: #111;
`
const RowMeta = styled.div`
  font-size: 12px;
  color: #666;
  margin-top: 2px;
`
const RowActions = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
`
const IconButton = styled.button`
  padding: 6px;
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
  padding: 32px 16px;
  color: #888;
  font-size: 14px;
`
const BackButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 0 0 16px;
  font-size: 14px;
  color: #666;
  background: none;
  border: none;
  cursor: pointer;
  &:hover {
    color: #111;
  }
`
const FormTitle = styled.h3`
  margin: 0 0 8px;
  font-size: 18px;
  font-weight: 600;
  color: #111;
`
const FormDesc = styled.p`
  margin: 0 0 20px;
  font-size: 13px;
  color: #666;
`
const Field = styled.div`
  margin-bottom: 16px;
`
const Label = styled.label`
  display: block;
  font-size: 12px;
  font-weight: 600;
  color: #333;
  margin-bottom: 6px;
`
const Input = styled.input`
  width: 100%;
  padding: 10px 12px;
  font-size: 14px;
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
  padding: 10px 12px;
  font-size: 14px;
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
  margin-top: 20px;
`
const SubmitBtn = styled.button`
  padding: 10px 20px;
  font-size: 14px;
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
  padding: 10px 20px;
  font-size: 14px;
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

export interface PositionCategoryCrudModalProps {
  isOpen: boolean
  onClose: () => void
}

const defaultForm: CreateGovernmentPositionDefinitionDto = {
  title: '',
  titleEn: null,
  titleLocal: null,
  positionType: 'HEAD_OF_STATE',
  description: null,
  rank: null,
  categoryId: null,
  organizationId: null,
  establishedDate: null,
  abolishedDate: null,
}

export function PositionCategoryCrudModal({
  isOpen,
  onClose,
}: PositionCategoryCrudModalProps) {
  const queryClient = useQueryClient()
  const [view, setView] = useState<'list' | 'form'>('list')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [positionTypeModalOpen, setPositionTypeModalOpen] = useState(false)
  const [categoryModalOpen, setCategoryModalOpen] = useState(false)
  const [form, setForm] = useState<CreateGovernmentPositionDefinitionDto>(defaultForm)

  const { data: definitions = [], isLoading } = useQuery({
    queryKey: ['position-definitions'],
    queryFn: () => personCareerApi.getPositionDefinitions(),
    enabled: isOpen,
  })

  const { data: categories = [] } = useQuery({
    queryKey: ['admin-dept-categories'],
    queryFn: () => administrationDepartmentApi.getCategories(),
    enabled: isOpen && view === 'form',
  })

  const list = definitions as GovernmentPositionDefinition[]

  const byType = useMemo(() => {
    const map = new Map<string, GovernmentPositionDefinition[]>()
    POSITION_TYPE_OPTIONS.forEach((o) => map.set(o.value, []))
    list.forEach((d) => {
      const key = d.positionType
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(d)
    })
    return map
  }, [list])

  const refetch = () => {
    queryClient.invalidateQueries({ queryKey: ['position-definitions'] })
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
        categoryId: def.categoryId ?? null,
        organizationId: def.organizationId ?? null,
        establishedDate: def.establishedDate ?? null,
        abolishedDate: def.abolishedDate ?? null,
      })
    } else {
      setEditingId(null)
      setForm({ ...defaultForm, positionType: 'HEAD_OF_STATE' })
    }
    setView('form')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title.trim()) {
      toast.error('직위명을 입력해주세요.')
      return
    }
    const payload: CreateGovernmentPositionDefinitionDto & UpdateGovernmentPositionDefinitionDto = { ...form }
    try {
      if (editingId) {
        await personCareerApi.updatePositionDefinition(editingId, payload)
        toast.success('관직 정의가 수정되었습니다.')
      } else {
        await personCareerApi.createPositionDefinition(payload)
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
    POSITION_TYPE_OPTIONS.find((o) => o.value === form.positionType)?.label ?? form.positionType

  if (!isOpen) return null

  const content = (
    <Overlay onClick={onClose}>
      <ModalCard onClick={(e) => e.stopPropagation()}>
        <ModalHeader>
          <ModalTitle>관직 정의 관리</ModalTitle>
          <CloseBtn type="button" onClick={onClose} aria-label="닫기">
            <FiX size={22} />
          </CloseBtn>
        </ModalHeader>
        <ModalBody>
          {view === 'list' ? (
            <>
              <ListHead>
                <ListTitle>직함 목록 (직위 유형별)</ListTitle>
                <AddButton type="button" onClick={() => openForm(null)}>
                  <FiPlus size={18} />
                  직함 추가
                </AddButton>
              </ListHead>
              {isLoading ? (
                <EmptyState>로딩 중...</EmptyState>
              ) : list.length === 0 ? (
                <EmptyState>
                  등록된 직함이 없습니다. 직함 추가 버튼으로 등록하세요.
                </EmptyState>
              ) : (
                <>
                  {POSITION_TYPE_OPTIONS.map((opt) => {
                    const items = byType.get(opt.value) ?? []
                    if (items.length === 0) return null
                    return (
                      <GroupSection key={opt.value}>
                        <GroupTitle>{opt.label}</GroupTitle>
                        {items.map((def) => (
                          <Row key={def.id}>
                            <div>
                              <RowTitle>{def.title}</RowTitle>
                              {(def.titleEn || def.titleLocal) && (
                                <RowMeta>
                                  {[def.titleEn, def.titleLocal].filter(Boolean).join(' · ')}
                                </RowMeta>
                              )}
                            </div>
                            <RowActions>
                              <IconButton type="button" onClick={() => openForm(def)} title="수정">
                                <FiEdit2 size={16} />
                              </IconButton>
                              <IconButton
                                type="button"
                                onClick={() => handleDelete(def.id, def.title)}
                                title="삭제"
                              >
                                <FiTrash2 size={16} />
                              </IconButton>
                            </RowActions>
                          </Row>
                        ))}
                      </GroupSection>
                    )
                  })}
                </>
              )}
            </>
          ) : (
            <>
              <BackButton type="button" onClick={() => setView('list')}>
                <FiArrowLeft size={18} />
                목록
              </BackButton>
              <FormTitle>{editingId ? '관직 정의 수정' : '직함 추가'}</FormTitle>
              <FormDesc>
                직위 유형(enum)으로 분류하고, 직함명을 등록합니다.
              </FormDesc>
              <form onSubmit={handleSubmit}>
                <Field>
                  <Label>직함명 *</Label>
                  <Input
                    value={form.title}
                    onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                    placeholder="예: 대통령, 총리, 국왕"
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
                  <Label>표시 순서 (rank)</Label>
                  <Input
                    type="number"
                    min={0}
                    value={form.rank ?? ''}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        rank: e.target.value === '' ? null : parseInt(e.target.value, 10),
                      }))
                    }
                    placeholder="0"
                  />
                </Field>
                <Field>
                  <Label>부처 카테고리</Label>
                  <SelectBtn
                    type="button"
                    $hasValue={!!form.categoryId}
                    onClick={() => setCategoryModalOpen(true)}
                  >
                    <span>
                      {form.categoryId
                        ? categories.find((c) => c.id === form.categoryId)?.name ?? '선택됨'
                        : '선택 안 함'}
                    </span>
                    <FiChevronDown size={18} />
                  </SelectBtn>
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
                </Field>
                <FormActions>
                  <SubmitBtn type="submit">{editingId ? '수정' : '등록'}</SubmitBtn>
                  <CancelBtn type="button" onClick={() => setView('list')}>
                    취소
                  </CancelBtn>
                </FormActions>
              </form>
            </>
          )}
        </ModalBody>
      </ModalCard>
    </Overlay>
  )

  return createPortal(content, document.body)
}
