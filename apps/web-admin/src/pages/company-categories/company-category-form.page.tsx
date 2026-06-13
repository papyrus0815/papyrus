import React, { useEffect, useState } from 'react'

import { FiSave, FiArrowLeft } from 'react-icons/fi'
import { useNavigate, useParams } from 'react-router-dom'
import styled, { css } from 'styled-components'

import type { CompanyCategory } from '@/shared/api/company-category'
import { companyCategoryApi } from '@/shared/api/company-category'
import { notify } from '@/shared/ui/toast'

const Page = styled.div`
  padding: calc(var(--header-height, 64px) + 1.5rem) 2rem 4rem;
  max-width: 640px;
  margin: 0 auto;
`

const Header = styled.header`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1.5rem;
`

const BackBtn = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  flex-shrink: 0;
  border-radius: 12px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  background: ${({ theme }) => theme.colors.background.primary};
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;
  transition:
    background 0.18s,
    color 0.18s,
    border-color 0.18s,
    transform 0.12s;

  &:hover {
    background: ${({ theme }) => theme.colors.hover};
    color: ${({ theme }) => theme.colors.text.primary};
    border-color: ${({ theme }) => theme.colors.border.medium};
  }
  &:active {
    transform: scale(0.96);
  }
`

const Title = styled.h1`
  font-size: 1.375rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  margin: 0;
  color: ${({ theme }) => theme.colors.text.primary};
`

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 1.1rem;
  padding: 1.5rem;
  border-radius: 16px;
  background: ${({ theme }) => theme.colors.background.primary};
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  box-shadow: 0 1px 3px ${({ theme }) => theme.colors.shadow.sm};
`

const Row = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.4rem;

  label {
    font-weight: 600;
    font-size: 0.8125rem;
    color: ${({ theme }) => theme.colors.text.secondary};
  }

  input,
  select,
  textarea {
    padding: 0.6rem 0.75rem;
    border-radius: 10px;
    font-size: 0.875rem;
    background: ${({ theme }) => theme.colors.background.primary};
    border: 1px solid ${({ theme }) => theme.colors.border.default};
    color: ${({ theme }) => theme.colors.text.primary};
    transition:
      border-color 0.18s,
      box-shadow 0.18s;

    &::placeholder {
      color: ${({ theme }) => theme.colors.text.tertiary};
    }

    &:focus {
      outline: none;
      border-color: ${({ theme }) => theme.colors.primary};
      box-shadow: 0 0 0 3px
        ${({ theme }) =>
          theme.mode === 'dark'
            ? 'rgba(99, 102, 241, 0.25)'
            : 'rgba(99, 102, 241, 0.15)'};
    }
  }

  textarea {
    min-height: 90px;
    resize: vertical;
    font-family: inherit;
  }

  select option {
    background: ${({ theme }) => theme.colors.background.primary};
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

const Hint = styled.p`
  font-size: 12px;
  margin: 0;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const Actions = styled.div`
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
  margin-top: 0.5rem;
`

const Btn = styled.button<{ $primary?: boolean }>`
  padding: 0.6rem 1.1rem;
  border-radius: 12px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  font-weight: 600;
  transition:
    background 0.18s,
    border-color 0.18s,
    transform 0.12s,
    box-shadow 0.18s;

  &:active {
    transform: scale(0.97);
  }
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  ${({ theme, $primary }) =>
    $primary
      ? css`
          background: ${theme.colors.gradient.primary};
          color: ${theme.colors.button.text};
          border: none;
          box-shadow: 0 4px 14px ${theme.colors.shadow.md};
          &:hover:not(:disabled) {
            box-shadow: 0 6px 18px ${theme.colors.shadow.lg};
          }
        `
      : css`
          background: ${theme.colors.background.primary};
          color: ${theme.colors.text.secondary};
          border: 1px solid ${theme.colors.border.default};
          &:hover {
            background: ${theme.colors.hover};
            color: ${theme.colors.text.primary};
            border-color: ${theme.colors.border.medium};
          }
        `}
`

const LoadingText = styled.p`
  font-size: 14px;
  color: ${({ theme }) => theme.colors.text.secondary};
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
      notify.error('카테고리명을 입력해주세요.')
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
      notify.error(err instanceof Error ? err.message : '저장에 실패했습니다.')
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
      <Header>
        <BackBtn
          type="button"
          onClick={() => navigate('/company-categories')}
          aria-label="목록으로"
        >
          <FiArrowLeft size={18} />
        </BackBtn>
        <Title>{isEdit ? '카테고리 수정' : '카테고리 추가'}</Title>
      </Header>

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
