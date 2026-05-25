import React, { useEffect, useState } from 'react'

import { FiSave, FiArrowLeft } from 'react-icons/fi'
import { useNavigate, useParams } from 'react-router-dom'
import styled, { css } from 'styled-components'

import type { CompanyCategory } from '@/shared/api/company-category'
import { companyCategoryApi } from '@/shared/api/company-category'

const Page = styled.div`
  padding: 1.5rem 2rem;
  max-width: 640px;
  margin: 0 auto;
`

const Title = styled.h1`
  font-size: 1.25rem;
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#f1f5f9' : '#0f172a')};
`

const BackIcon = styled(FiArrowLeft)`
  cursor: pointer;
  color: #64748b;
  &:hover {
    color: ${({ theme }) => (theme.mode === 'dark' ? '#e2e8f0' : '#0f172a')};
  }
`

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`

const Row = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.35rem;

  label {
    font-weight: 500;
    font-size: 0.9rem;
    color: ${({ theme }) => (theme.mode === 'dark' ? '#94a3b8' : '#374151')};
  }

  input,
  select,
  textarea {
    padding: 0.5rem 0.75rem;
    border-radius: 8px;
    font-size: 0.875rem;
    transition: all 0.2s;
    ${({ theme }) =>
      theme.mode === 'dark'
        ? css`
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.1);
            color: #f1f5f9;
            &:focus {
              outline: none;
              border-color: rgba(99, 102, 241, 0.5);
            }
          `
        : css`
            background: white;
            border: 1px solid #e5e7eb;
            color: #0f172a;
            &:focus {
              outline: none;
              border-color: #6366f1;
            }
          `}
  }

  textarea {
    min-height: 80px;
    resize: vertical;
    font-family: inherit;
  }

  select option {
    background: ${({ theme }) => (theme.mode === 'dark' ? '#1e1e2e' : 'white')};
    color: ${({ theme }) => (theme.mode === 'dark' ? '#f1f5f9' : '#0f172a')};
  }
`

const Hint = styled.p`
  font-size: 12px;
  margin: 0;
  color: #64748b;
`

const Actions = styled.div`
  display: flex;
  gap: 0.75rem;
  margin-top: 0.5rem;
`

const Btn = styled.button<{ $primary?: boolean }>`
  padding: 0.5rem 1rem;
  border-radius: 8px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  font-weight: 500;
  transition: all 0.2s;
  &:hover {
    opacity: 0.9;
  }
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  ${({ theme, $primary }) =>
    $primary
      ? css`
          background: #6366f1;
          color: white;
          border: none;
        `
      : theme.mode === 'dark'
        ? css`
            background: rgba(255, 255, 255, 0.06);
            color: #94a3b8;
            border: 1px solid rgba(255, 255, 255, 0.1);
          `
        : css`
            background: white;
            color: #374151;
            border: 1px solid #e5e7eb;
          `}
`

const LoadingText = styled.p`
  font-size: 14px;
  color: #64748b;
`

export const CompanyCategoryFormPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const isEdit = !!id && id !== 'new'
  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)
  const [options, setOptions] = useState<CompanyCategory[]>([])
  const [form, setForm] = useState({
    name: '',
    slug: '',
    description: '',
    parentId: '',
  })

  useEffect(() => {
    companyCategoryApi
      .getAll()
      .then(setOptions)
      .catch(() => setOptions([]))
  }, [])

  useEffect(() => {
    if (!isEdit) return
    setLoading(true)
    companyCategoryApi
      .getById(id!)
      .then((c) => {
        if (c) {
          setForm({
            name: c.name,
            slug: c.slug ?? '',
            description: c.description ?? '',
            parentId: c.parentId ?? '',
          })
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [id, isEdit])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) {
      alert('카테고리명을 입력해주세요.')
      return
    }
    setSaving(true)
    const payload = {
      name: form.name.trim(),
      slug: form.slug.trim() || null,
      description: form.description.trim() || null,
      parentId: form.parentId || null,
    }
    try {
      if (isEdit) {
        await companyCategoryApi.update(id!, payload)
      } else {
        await companyCategoryApi.create(payload)
      }
      navigate('/company-categories')
    } catch (err) {
      alert(err instanceof Error ? err.message : '저장에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }

  if (loading)
    return (
      <Page>
        <LoadingText>불러오는 중...</LoadingText>
      </Page>
    )

  return (
    <Page>
      <Title>
        <BackIcon size={20} onClick={() => navigate('/company-categories')} />
        {isEdit ? '카테고리 수정' : '카테고리 추가'}
      </Title>

      <Form onSubmit={handleSubmit}>
        <Row>
          <label>카테고리명 *</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            placeholder="예: 무역회사"
            maxLength={100}
          />
        </Row>
        <Row>
          <label>슬러그</label>
          <input
            type="text"
            value={form.slug}
            onChange={(e) => setForm((p) => ({ ...p, slug: e.target.value }))}
            placeholder="예: trading-company"
            maxLength={80}
          />
          <Hint>URL·외부 참조용 고유 코드 (전체에서 유일해야 함).</Hint>
        </Row>
        <Row>
          <label>상위 카테고리</label>
          <select
            value={form.parentId}
            onChange={(e) => setForm((p) => ({ ...p, parentId: e.target.value }))}
          >
            <option value="">— 없음 (최상위) —</option>
            {options
              .filter((o) => !isEdit || o.id !== id)
              .map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
          </select>
        </Row>
        <Row>
          <label>설명</label>
          <textarea
            value={form.description}
            onChange={(e) =>
              setForm((p) => ({ ...p, description: e.target.value }))
            }
            placeholder="카테고리에 대한 간단한 설명"
          />
        </Row>
        <Actions>
          <Btn type="button" onClick={() => navigate('/company-categories')}>
            취소
          </Btn>
          <Btn $primary type="submit" disabled={saving}>
            <FiSave size={16} />
            {saving ? '저장 중...' : '저장'}
          </Btn>
        </Actions>
      </Form>
    </Page>
  )
}
